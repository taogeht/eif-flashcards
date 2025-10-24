'use client'

interface AssignmentStartOptions {
  assignmentId?: string | null
  studentId?: string | null
}

interface AssignmentCompleteOptions extends AssignmentStartOptions {
  durationMs?: number
  accuracy?: number
  metrics?: {
    minutes?: number
    rounds?: number
    cards?: number
  }
}

const toJson = (value: unknown) => JSON.stringify(value)

export async function startAssignmentSubmission({ assignmentId, studentId }: AssignmentStartOptions) {
  if (!assignmentId || !studentId) {
    return
  }

  try {
    await fetch('/api/assignments/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: toJson({ assignmentId, studentId })
    })
  } catch (error) {
    console.error('Unable to mark assignment as started', error)
  }
}

export async function completeAssignmentSubmission({
  assignmentId,
  studentId,
  durationMs,
  accuracy,
  metrics
}: AssignmentCompleteOptions) {
  if (!assignmentId || !studentId) {
    return
  }

  try {
    await fetch('/api/assignments/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: toJson({
        assignmentId,
        studentId,
        durationMs,
        accuracy,
        metrics
      })
    })
  } catch (error) {
    console.error('Unable to update assignment submission', error)
  }
}
