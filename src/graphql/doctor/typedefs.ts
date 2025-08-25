export const typeDefs = `
    type DoctorCreationRes {
        id: Int!
    }
    type AuthDoctorResponse {
        id: Int!
        registrationComplete: Boolean!
        email: String!
    }
    type Doctor {
        id: Int!
        name: String
        email: String!
        phone: String
        password: String
        experience: String
        languages: [String!]
        qualifications: String
        specializations: [String!]
        location: String
        hospital: String
        fees: Int
        image: String
        description: String
    }
    type DoctorAuth {
        id: Int!
        name: String!
        email: String!
        phone: String!
    }
    input DoctorDocumentInput {
        url: String!
        type: String!
    }
    type SaveDoctorScheduleResponse {
        success: Boolean!
        message: String!
    }

    input SlotInput {
        start: String!
        end: String!
    }

    input DoctorSlotRuleInput {
        dayOfWeek: Int!
        slots: [SlotInput!]!
        duration: Int
    }

    input DoctorSlotOverrideInput {
        date: String!
        slots: [SlotInput!]!
        duration: Int
    }
    type AppointmentUser {
        id: Int!
        name: String!
        phone: String!
    }
    scalar DateTime
    type Appointment {
        id: Int!
        date: DateTime!
        time: String!
        duration: Int!
        status: AppointmentStatus!
        amount: Int!
        user: AppointmentUser!
    }
    enum AppointmentStatus {
        SCHEDULED
        COMPLETED
        CANCELLED
        NO_SHOW
    }
    type DaUser {
        id: Int!
        firstName: String!
        lastName: String!
        phone: String!
    }
    type DaAppointment {
        id: Int!
        date: String!
        time: String!
        status: String!
        user: User!
    }
    type UpcomingAppointmentsResponse {
        appointments: [DaAppointment!]!
        todayCount: Int!
    }
    type DoctorCard {
        id: Int!
        name: String
        experience: String
        languages: [String]
        qualifications: String
        specializations: [String!]
        location: String
        hospital: String
        fees: Int
        availability: String
        image: String
        showInstantBooking: Boolean
    }
    type DoctorBooking {
        id: Int!
        name: String
        experience: String
        languages: [String!]
        qualifications: String
        location: String
        hospital: String
        image: String
        fees: Int
        description: String
        registrationNo: String
        pauseAllBookings: Boolean
        specializations: [String!]
        availableSlots: [AvailableSlot!]
        slotOverrides: [SlotOverride!]
        appointments: [ShowAppointment!]!
    }
    type AvailableSlot {
        dayOfWeek: Int!
        duration: Int!
        slots: [SlotStatus!]!
    }
    type SlotOverride {
        date: String!
        duration: Int!
        slots: [SlotStatus!]!
    }
    type SlotStatus {
        start: String!
        end: String!
        isTaken: Boolean!
    }
    type DoctorSchedule {
        rules: [AvailableSlot!]!
        overrides: [SlotOverride!]!
    }
    type ShowAppointment {
        id: ID!
        date: String!
        time: String!
        status: String!
    }
    type DoctorSlotsForDateResponse {
        slots: [Slot!]!
        pauseAllBookings: Boolean!
    }
    type Slot {
        start: String!   # e.g. "09:00"
        end: String!     # e.g. "09:30"
        isTaken: Boolean!
    }
    input DoctorSlotsForDateInput {
        doctorId: Int!
        date: String! # YYYY-MM-DD
    }
`