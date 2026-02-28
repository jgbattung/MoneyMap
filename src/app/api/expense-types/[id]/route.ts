import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params } : { params: { id: string } }
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

    const expenseType = await db.expenseType.findUnique({
      where: {
        id: id,
        userId: session.user.id
      },
      include: {
        subcategories: {
          orderBy: {
            name: 'asc'
          }
        }
      }
    });

    if (!expenseType) {
      return NextResponse.json(
        { error: 'Expense type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(expenseType, { status: 200 });

  } catch (error) {
    console.error('Error getting expense type: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { name, monthlyBudget, subcategoryChanges } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      // Update the expense type
      await tx.expenseType.update({
        where: {
          id: id,
          userId: session.user.id,
        },
        data: {
          name,
          monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null,
        }
      });

      // Handle subcategory changes if provided
      if (subcategoryChanges) {
        const { toCreate, toUpdate, toDelete } = subcategoryChanges;

        // Create new subcategories
        if (toCreate && Array.isArray(toCreate) && toCreate.length > 0) {
          await tx.expenseSubcategory.createMany({
            data: toCreate.map((sub: { name: string }) => ({
              userId: session.user.id,
              expenseTypeId: id,
              name: sub.name,
            }))
          });
        }

        // Update existing subcategories
        if (toUpdate && Array.isArray(toUpdate) && toUpdate.length > 0) {
          for (const sub of toUpdate) {
            await tx.expenseSubcategory.update({
              where: {
                id: sub.id,
                userId: session.user.id,
              },
              data: {
                name: sub.name,
              }
            });
          }
        }

        if (toDelete && Array.isArray(toDelete) && toDelete.length > 0) {
          await tx.expenseSubcategory.deleteMany({
            where: {
              id: { in: toDelete },
              userId: session.user.id,
            }
          });
        }
      }

      const expenseTypeWithSubcategories = await tx.expenseType.findUnique({
        where: { id: id },
        include: {
          subcategories: {
            orderBy: {
              name: 'asc'
            }
          }
        }
      });

      return expenseTypeWithSubcategories;
    });

    return NextResponse.json(result, { status: 200 });
 
  } catch (error) {
    console.error('Error updating expense type: ', error);

    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An expense type with this name already exists' },
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
  { params }: { params: { id: string } }
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

    const expenseTypeToDelete = await db.expenseType.findUnique({
      where: {
        id: id,
        userId: session.user.id
      },
    });

    if (!expenseTypeToDelete) {
      return NextResponse.json(
        { error: 'Expense type not found' },
        { status: 404 }
      );
    }

    if (expenseTypeToDelete.name.toLocaleLowerCase() === "uncategorized") {
      return NextResponse.json(
        { error: 'Cannot delete Uncategorized expense type' },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      let uncategorizedType = await tx.expenseType.findFirst({
        where: {
          userId: session.user.id,
          name: 'Uncategorized',
        }
      });

      if (!uncategorizedType) {
        uncategorizedType = await tx.expenseType.create({
          data: {
            userId: session.user.id,
            name: "Uncategorized",
            monthlyBudget: null,
          }
        });
      }

      const transactionCount = await tx.expenseTransaction.count({
        where: {
          expenseTypeId: id,
        }
      });

      if (transactionCount > 0) {
        await tx.expenseTransaction.updateMany({
          where: {
            expenseTypeId: id,
          },
          data: {
            expenseTypeId: uncategorizedType.id,
          }
        });
      }

      await tx.expenseType.delete({
        where: {
          id: id,
          userId: session.user.id,
        }
      });

      return { transactionCount };
    })

    return NextResponse.json(
      {
        message: 'Budget deleted successfully',
        reassignedCount: result.transactionCount,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting expense type: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}