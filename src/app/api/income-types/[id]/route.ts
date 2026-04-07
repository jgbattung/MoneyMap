import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { IncomeTypeValidation } from "@/lib/validations/income";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params } : { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers()
    }); 

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const incomeType = await db.incomeType.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!incomeType) {
      return NextResponse.json(
        { error: 'Income type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(incomeType, { status: 200 });
  } catch (error) {
    console.error('Error getting income type: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params } : { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers()
    }); 

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const parseResult = IncomeTypeValidation.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, monthlyTarget } = parseResult.data;

    const updatedIncomeType = await db.incomeType.update({
      where: {
        id: id,
        userId: session.user.id,
      },
      data: {
        name,
        monthlyTarget: monthlyTarget ? parseFloat(monthlyTarget) : null,
      }
    });

    return NextResponse.json(updatedIncomeType, { status: 200 });

  } catch (error) {
    console.error('Error updating income type: ', error);

    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
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

export async function DELETE(
    request: NextRequest,
  { params } : { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const incomeTypeToDelete = await db.incomeType.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!incomeTypeToDelete) {
      return NextResponse.json(
        { error: 'Income type not found' },
        { status: 404 }
      );
    }

    if (incomeTypeToDelete.name.toLowerCase() === "uncategorized") {
      return NextResponse.json(
        { error: 'Cannot delete the Uncategorized income type' },
        { status: 400 }
      );
    }

    // Find or create "Uncategorized" before the transaction (idempotent)
    let uncategorizedType = await db.incomeType.findFirst({
      where: {
        userId: session.user.id,
        name: 'Uncategorized',
      }
    });

    if (!uncategorizedType) {
      uncategorizedType = await db.incomeType.create({
        data: {
          userId: session.user.id,
          name: "Uncategorized",
          monthlyTarget: null,
        }
      });
    }

    const results = await db.$transaction([
      db.incomeTransaction.updateMany({
        where: {
          incomeTypeId: id,
        },
        data: {
          incomeTypeId: uncategorizedType.id,
        }
      }),
      db.incomeType.delete({
        where: {
          id: id,
          userId: session.user.id,
        }
      }),
    ]);

    const reassignedCount = (results[0] as { count: number }).count;

    return NextResponse.json(
      {
        message: 'Income type deleted successfully',
        reassignedCount,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting income type: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );  
  }
}