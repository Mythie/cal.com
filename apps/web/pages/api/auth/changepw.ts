import { IdentityProvider } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { getSlimServerSession } from "@calcom/features/auth/lib/getSlimServerSession";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { verifyPassword } from "@calcom/features/auth/lib/verifyPassword";
import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSlimServerSession({ req });

  if (!session || !session.user || !session.user.email) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      password: true,
      identityProvider: true,
    },
  });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (user.identityProvider !== IdentityProvider.CAL) {
    return res.status(400).json({ error: ErrorCode.ThirdPartyIdentityProviderEnabled });
  }

  const oldPassword = req.body.oldPassword;
  const newPassword = req.body.newPassword;

  const currentPassword = user.password;
  if (!currentPassword) {
    return res.status(400).json({ error: ErrorCode.UserMissingPassword });
  }

  const passwordsMatch = await verifyPassword(oldPassword, currentPassword);
  if (!passwordsMatch) {
    return res.status(403).json({ error: ErrorCode.IncorrectPassword });
  }

  if (oldPassword === newPassword) {
    return res.status(400).json({ error: ErrorCode.NewPasswordMatchesOld });
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: hashedPassword,
    },
  });

  res.status(200).json({ message: "Password updated successfully" });
}
