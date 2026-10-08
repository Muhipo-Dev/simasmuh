/**
 * Utility functions for schedule normalization and merging consecutive teaching periods.
 */

export const DAYS_NAME = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export interface MergedSchedule {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  classId: string
  subjectId: string
  teacherId: string
  class?: any
  subject?: any
  teacher?: any
  scheduleIds: string[]
  totalPeriods: number
  allSchedules: any[]
  [key: string]: any
}

export function parseTimeToMinutes(timeStr: string | undefined | null): number {
  if (!timeStr) return 0
  const clean = timeStr.replace('.', ':').trim()
  const parts = clean.split(':')
  const hours = parseInt(parts[0] || '0', 10) || 0
  const minutes = parseInt(parts[1] || '0', 10) || 0
  return hours * 60 + minutes
}

/**
 * Merge consecutive schedules that have the same teacher, subject, class, and day.
 * Merges continuous Jam Pelajaran (1 JP, 2 JP, up to a maximum of 3 JP per 1 journal session).
 */
export function mergeConsecutiveSchedules(schedules: any[], maxPeriods: number = 3): MergedSchedule[] {
  if (!Array.isArray(schedules) || schedules.length === 0) return []

  // 1. Sort schedules by dayOfWeek, then by startTime
  const sorted = [...schedules].sort((a, b) => {
    const dayA = Number(a.dayOfWeek ?? 1)
    const dayB = Number(b.dayOfWeek ?? 1)
    if (dayA !== dayB) return dayA - dayB
    return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
  })

  const merged: MergedSchedule[] = []

  for (const curr of sorted) {
    if (!curr) continue

    const currDay = Number(curr.dayOfWeek ?? 1)
    const currStartMin = parseTimeToMinutes(curr.startTime)
    const currEndMin = parseTimeToMinutes(curr.endTime)
    const currTeacherId = curr.teacherId || curr.teacher?.id || curr.teacher?.userId
    const currClassId = curr.classId || curr.class?.id || curr.class?.name
    const currSubjectId = curr.subjectId || curr.subject?.id || curr.subject?.code

    const prev = merged[merged.length - 1]

    if (prev && (prev.totalPeriods || 1) < maxPeriods) {
      const prevDay = Number(prev.dayOfWeek ?? 1)
      const prevEndMin = parseTimeToMinutes(prev.endTime)
      const prevTeacherId = prev.teacherId || prev.teacher?.id || prev.teacher?.userId
      const prevClassId = prev.classId || prev.class?.id || prev.class?.name
      const prevSubjectId = prev.subjectId || prev.subject?.id || prev.subject?.code

      // Check if it matches same day, teacher, class, subject and is consecutive (or overlap / <= 10 min break)
      const isSameDay = currDay === prevDay
      const isSameTeacher = currTeacherId && prevTeacherId && currTeacherId === prevTeacherId
      const isSameClass = currClassId && prevClassId && currClassId === prevClassId
      const isSameSubject = currSubjectId && prevSubjectId && currSubjectId === prevSubjectId
      
      // Consecutive check: current starts at or before prev ends, or within 10 min bell transition
      const isConsecutive = isSameDay && isSameTeacher && isSameClass && isSameSubject && 
        (currStartMin <= prevEndMin + 10 && currEndMin > prevEndMin)

      if (isConsecutive) {
        // Extend previous merged schedule
        if (currEndMin > prevEndMin) {
          prev.endTime = curr.endTime
        }
        if (curr.id && !prev.scheduleIds.includes(curr.id)) {
          prev.scheduleIds.push(curr.id)
        }
        prev.totalPeriods = (prev.totalPeriods || 1) + 1
        prev.allSchedules.push(curr)
        continue
      }
    }

    // Otherwise create a new merged entry
    merged.push({
      ...curr,
      id: curr.id,
      dayOfWeek: currDay,
      startTime: curr.startTime,
      endTime: curr.endTime,
      classId: curr.classId || curr.class?.id,
      subjectId: curr.subjectId || curr.subject?.id,
      teacherId: curr.teacherId || curr.teacher?.id,
      scheduleIds: curr.id ? [curr.id] : [],
      totalPeriods: 1,
      allSchedules: [curr]
    })
  }

  return merged
}

/**
 * Check if a journal exists for a given schedule (including merged schedule group) on a specific date.
 */
export function findJournalForSchedule(
  schedule: MergedSchedule | any,
  journals: any[],
  dateStr?: string
): any | undefined {
  if (!schedule || !Array.isArray(journals) || journals.length === 0) return undefined

  const scheduleIds: string[] = schedule.scheduleIds || (schedule.id ? [schedule.id] : [])
  const targetDate = dateStr || new Date().toISOString().split('T')[0]

  return journals.find(j => {
    if (!j) return false
    const jDateStr = j.date ? new Date(j.date).toISOString().split('T')[0] : ''
    if (targetDate && jDateStr !== targetDate) return false

    // Direct match by schedule ID or any merged schedule ID
    if (scheduleIds.includes(j.scheduleId) || j.scheduleId === schedule.id) {
      return true
    }

    // Direct match if journal has loaded schedule relation with matching ID
    if (j.schedule && (scheduleIds.includes(j.schedule.id) || j.schedule.id === schedule.id)) {
      return true
    }

    return false
  })
}
