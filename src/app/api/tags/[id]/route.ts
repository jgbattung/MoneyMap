import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { z } from "zod";

const RenameTagSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
});

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const tag = await db.tag.findUnique({ where: { id } });

    if (!tag || tag.userId !== session.user.id) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await db.tag.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const tag = await db.tag.findUnique({ where: { id } });

    if (!tag || tag.userId !== session.user.id) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = RenameTagSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await db.tag.update({
      where: { id },
      data: { name: parsed.data.name },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "A tag with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
