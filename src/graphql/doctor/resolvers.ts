import { prismaClient } from "../../lib/db";

const queries = {

}

const mutations = {
    createDoctor: async(__: any, {firstName, lastName, email, password, phone}: {firstName: string, lastName: string, email: string, password: string, phone: string}) => {
        await prismaClient.user.create({
            data: {
                email, firstName, lastName, password, phone
            }
        })
        return true;
    }
}

export const resolvers = { queries, mutations }