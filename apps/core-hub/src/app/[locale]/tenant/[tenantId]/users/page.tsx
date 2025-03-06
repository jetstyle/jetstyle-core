'use client';

import { type ResourceDescription } from '@jetstyle/ui/types/types'
import ResourcePage from "@jetstyle/ui/components/ResourcePage";

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
            propName: 'firstName',
            nameFromApi: 'firstName',
            propType: 'string',
        },
        {
            propName: 'lastName',
            nameFromApi: 'lastName',
            propType: 'string',
        },
        {
            propName: 'username',
            nameFromApi: 'username',
            propType: 'string',
        },
        {
            propName: 'email',
            nameFromApi: 'email',
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
    apiPath: "/users",
    listName: "Users",
    name: "User",
}

export default function UsersPage () {
    return (
        <ResourcePage
            resourceDescription={resourceDescription}
        />
    )
}
