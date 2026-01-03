import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

// GET - Fetch all trainers
export async function GET(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()
    
    // Get all trainers with client counts
    const { data: trainers, error } = await supabase
      .from('trainers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Get client counts for each trainer
    const trainersWithStats = await Promise.all(
      (trainers || []).map(async (trainer) => {
        const { count } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('trainer_id', trainer.id)
        
        return {
          ...trainer,
          clientCount: count || 0,
        }
      })
    )

    return NextResponse.json({ trainers: trainersWithStats })
  } catch (error: any) {
    console.error('Error fetching trainers:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trainers' },
      { status: 500 }
    )
  }
}






