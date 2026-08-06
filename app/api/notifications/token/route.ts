import { NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

export const POST = withAuth(async (req, { user }) => {
  const { token, platform } = await req.json() as {
    token: string;
    platform: "ios" | "android";
  };

  if (!token || !platform) {
    return NextResponse.json(
      { error: "token and platform are required" },
      { status: 400 },
    );
  }

  try {
    await prisma.pushToken.upsert({
      where: { token },
      update: { user_id: user.id, platform },
      create: { token, platform, user_id: user.id },
    });

    return NextResponse.json({ data: { registered: true } });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to register push token");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const DELETE = withAuth(async (req, { user }) => {
  const { token } = await req.json() as { token: string };

  if (!token) {
    return NextResponse.json(
      { error: "token is required" },
      { status: 400 },
    );
  }

  try {
    await prisma.pushToken.deleteMany({
      where: { token, user_id: user.id },
    });

    return NextResponse.json({ data: { unregistered: true } });
  } catch (err) {
    authLogger.error(
      { err, userId: user.id },
      "Failed to unregister push token",
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
