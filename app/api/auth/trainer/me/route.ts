import { NextRequest, NextResponse } from 'next/server'
import { checkAdminSession, getTrainerClientCount, getTrainerExerciseCount } from '@/lib/admin-auth'

// GET - Get current trainer info
export async function GET(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get client and exercise counts if trainer
    let clientCount = 0
    let exerciseCount = 0
    if (session.trainerId) {
      clientCount = await getTrainerClientCount(session.trainerId)
      exerciseCount = await getTrainerExerciseCount(session.trainerId)
    }

    return NextResponse.json({
      trainer: {
        id: session.trainerId,
        email: session.email,
        fullName: session.trainerData?.fullName || null,
        businessName: session.trainerData?.businessName || null,
        subscriptionTier: session.trainerData?.subscriptionTier || 'free',
        subscriptionStatus: session.trainerData?.subscriptionStatus || 'active',
        maxClients: session.trainerData?.maxClients || 9999,
        maxExercises: session.trainerData?.maxExercises || 0,
        clientCount,
        exerciseCount,
        isLegacyAdmin: !session.trainerId,
      }
    })
  } catch (error: any) {
    console.error('Error fetching trainer info:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trainer info' },
      { status: 500 }
    )
  }
}

