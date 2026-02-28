import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const incomeTypes = await db.incomeType.findMany({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json(incomeTypes, { status: 200 });
  } catch (error) {
    console.error('Error getting income types: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { name, monthlyTarget } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const incomeType = await db.incomeType.create({
      data: {
        userId: session.user.id,
        name,
        monthlyTarget: monthlyTarget ? parseFloat(monthlyTarget) : null,
      }
    })

    return NextResponse.json(incomeType, { status: 200 });
  } catch (error) {
    console.error('Error creating income type: ', error);

    if (error instanceof Error && 'code' in error && error.code === "P20002") {
      return NextResponse.json(
        { error: 'An income type with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}