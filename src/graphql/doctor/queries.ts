export const queries = `
    getDoctorInfo(id: Int!): DoctorBooking
    getDoctorDetails: Doctor
    getDoctorSchedule: DoctorSchedule
    getDoctorSlotsForDate(input: DoctorSlotsForDateInput!): DoctorSlotsForDateResponse!
    currentStepDoctor(DoctorId: Int!): curStep
    getDoctorDocUrl(filename: String!, type: String!): PresignedUrl!
    doctorAppointments(status: AppointmentStatus!): [Appointment!]!
    upcomingAppointments(limit: Int!): UpcomingAppointmentsResponse!
    fetchDoctorsBySpeciality(specialities: [String!]): [DoctorCard!]!
`