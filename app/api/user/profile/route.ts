import { NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

// ─── Types ────────────────────────────────────────────────────────────────

interface UpdateProfileBody {
  name?: string;
  phone?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
}

// ─── Shared select ────────────────────────────────────────────────────────

const profileSelect = {
  id: true,
  name: true,
  email: true,
  email_verified: true,
  username: true,
  phone: true,
  bio: true,
  avatar_url: true,
  created_at: true,
  updated_at: true,
} as const;

// ─── GET /api/user/profile ─────────────────────────────────────────────────
// Was: user.get("/profile", ...) behind user.use("/*", requireAuth)

export const GET = withAuth(async (_req, { user }) => {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: profileSelect,
    });

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    authLogger.debug({ userId: user.id }, "Profile fetched");

    return NextResponse.json({ data: profile });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to fetch profile");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

// ─── PATCH /api/user/profile ────────────────────────────────────────────────
// Was: user.patch("/profile", ...)

export const PATCH = withAuth(async (req, { user }) => {
  try {
    const body: UpdateProfileBody = await req.json();

    // ── Validate username uniqueness ──────────────────────────────────────
    if (body.username) {
      const taken = await prisma.user.findFirst({
        where: {
          username: body.username,
          NOT: { id: user.id },
        },
      });

      if (taken) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 422 },
        );
      }

      // validate username format — alphanumeric + dots + underscores
      const usernameRegex = /^[a-zA-Z0-9._]{3,30}$/;
      if (!usernameRegex.test(body.username)) {
        return NextResponse.json(
          {
            error:
              "Username must be 3–30 characters and contain only letters, numbers, dots or underscores",
          },
          { status: 400 },
        );
      }
    }

    // ── Validate phone format ─────────────────────────────────────────────
    if (body.phone) {
      const phoneRegex = /^\+?[0-9]{7,15}$/;
      if (!phoneRegex.test(body.phone)) {
        return NextResponse.json(
          { error: "Invalid phone number format" },
          { status: 400 },
        );
      }
    }

    // ── Validate bio length ───────────────────────────────────────────────
    if (body.bio && body.bio.length > 160) {
      return NextResponse.json(
        { error: "Bio must be 160 characters or less" },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.username !== undefined && { username: body.username }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.avatar_url !== undefined && { avatar_url: body.avatar_url }),
      },
      select: profileSelect,
    });

    authLogger.info({ userId: user.id }, "Profile updated");

    return NextResponse.json({ data: updated });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to update profile");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
