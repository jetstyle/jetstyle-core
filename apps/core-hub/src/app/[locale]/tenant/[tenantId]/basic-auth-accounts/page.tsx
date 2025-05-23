'use client'

import { type ResourceDescription } from '@jetstyle/ui/types/types'
import ResourcePage from "@jetstyle/ui/components/ResourcePage"

const resourceDescription: ResourceDescription = {
    needTenant: true,
    props: [
        {
            propName: 'uuid',
            propType: 'string',
            nameFromApi: 'uuid',
            isReadOnly: true,
            isNotEdit: true
        },
        {
            propName: 'login',
            nameFromApi: 'login',
            propType: 'string',
        },
        {
            propName: 'tenant',
            nameFromApi: 'tenant',
            propType: 'string',
        },
        {
            propName: 'lastLoginAt',
            nameFromApi: 'lastLoginAt',
            propType: 'string',
        },
        {
            propName: 'status',
            nameFromApi: 'status',
            propType: 'string',
        },
        {
            propName: 'roles',
            nameFromApi: 'roles',
            propType: 'string',
        },
        {
            propName: 'createdAt',
            propType: 'datetime',
            isReadOnly: true,
            isNotEdit: true,
        },
        {
            propName: 'updatedAt',
            propType: 'datetime',
            isReadOnly: true,
            isNotEdit: true,
        }
    ],
    isEditable: true,
    apiService: "auth",
    apiPath: "/basic-auth-accounts",
    listName: "Basic auth accounts",
    name: "Basic auth account",
}

export default function AccountsPage () {
    return (
        <ResourcePage
            resourceDescription={resourceDescription}
        />
    )
}
