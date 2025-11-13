// /api/transfer-types/[id]/route.ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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

    const transferType = await db.transferType.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!transferType) {
      return NextResponse.json(
        { error: 'Transfer type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transferType, { status: 200 });
  } catch (error) {
    console.error('Error getting transfer type: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const updatedTransferType = await db.transferType.update({
      where: {
        id: id,
        userId: session.user.id,
      },
      data: {
        name,
      }
    });

    return NextResponse.json(updatedTransferType, { status: 200 });

  } catch (error) {
    console.error('Error updating transfer type: ', error);

    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A transfer type with this name already exists' },
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

    const transferTypeToDelete = await db.transferType.findUnique({
      where: {
        id: id,
        userId: session.user.id
      },
    });

    if (!transferTypeToDelete) {
      return NextResponse.json(
        { error: 'Transfer type not found' },
        { status: 404 }
      );
    }

    if (transferTypeToDelete.name.toLocaleLowerCase() === "uncategorized") {
      return NextResponse.json(
        { error: 'Cannot delete the Uncategorized transfer type' },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      let uncategorizedType = await tx.transferType.findFirst({
        where: {
          userId: session.user.id,
          name: 'Uncategorized',
        }
      });

      if (!uncategorizedType) {
        uncategorizedType = await tx.transferType.create({
          data: {
            userId: session.user.id,
            name: "Uncategorized",
          }
        });
      }

      const transactionCount = await tx.transferTransaction.count({
        where: {
          transferTypeId: id,
        }
      });

      if (transactionCount > 0) {
        await tx.transferTransaction.updateMany({
          where: {
            transferTypeId: id,
          },
          data: {
            transferTypeId: uncategorizedType.id,
          }
        });
      }

      await tx.transferType.delete({
        where: {
          id: id,
          userId: session.user.id,
        }
      });

      return { transactionCount }
    });

    return NextResponse.json(
      {
        message: 'Transfer type deleted successfully',
        reassignedCount: result.transactionCount,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting transfer type: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}