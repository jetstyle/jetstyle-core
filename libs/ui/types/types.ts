export type Resource = {
  uuid: string
}
// Resource is any API resource, it's not
// dedicated to resource-svc

export type APIResourceProps = {
  apiService: string
  apiPath: string
  uuid: string
}

export type PresenterOptions = {
  apiService: string
  apiPath: string
  propName?: string
}

export type ResourceDescription = {
  uuidProp?: string
  requiredProps?: Array<string>
  props: Array<ResourceProp>
  isEditable?: boolean
  apiService?: string
  apiPath?: string
  listName?: string
  name?: string
  needTenant?: boolean
}

export type ResourceProp = {
  propName: string
  propType: 'string' | 'number' | 'multichoice' | 'boolean' | 'file' | 'datetime'
  propDerived?: any
  propOptions?: Array<{ label: string; value: any; translated?: boolean }>;
  presenter?: any
  presenterOptions?: PresenterOptions
  nameFromApi?: string
  isReadOnly?: boolean
  isNotEdit?: boolean
  enum?: Array<ResourceEnumProp>
  values?: Array<{
    value: string
    label: string
  }>
}
export type ResourceEnumProp = string
// export type ResourceEnumProp = string | {
//   label: string
//   value: string
// }

export type PresenterProps = {
  instance: any
  prop: ResourceProp
  options?: PresenterOptions
}

export type APIListResp<T> = {
  limit: number
  offset: number
  result: Array<T>
  sort: {
    id: string
  }
  total: number
}

export type TFileAsset = {
  uuid: string
  tenant: string
  mimeType: string
  storageKey: string
  storageType: string
  fileSizeBytes: string
  storageBucket: string
  originFileName?: string
}

export type TChatAttachmentCp = {
  fileAsset: TFileAsset
  downloadUrl: string
}

export type TAvatarCp = TChatAttachmentCp

export type TChatMessage = {
  id: number
  uuid: string
  tenant: string
  chatChannelId: string
  plainText: string
  chatAttachmentsIds: Array<string>
  createdByUserId: string
  createdByCustomerId: string
  createdByOperatorId: string | null
  createdByCp: any
  chatAttachmentsCp: Array<TChatAttachmentCp>
  senderRole: string
  sendStatus: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type TPendingChatMessage = {
  uuid: string
  tenant: string
  chatChannelId: string
  plainText?: string
  chatAttachmentsIds: Array<string>
  createdByUserId: string
  chatAttachmentsCp: Array<TChatAttachmentCp>
  senderRole: string
  sendStatus: string
}

export type AuthParsedToken = {
  // reverse-domain audience
  aud: string

  // reverse-domain issuer
  iss: string

  exp: number
  iat: number

  // user.uuid
  sub: string

  tenant: string
  tpy?: 'tenant-management' | 'customer-tenant'
  name: string
  email?: string
  username?: string

  scopes: Array<string>
}

export type TChatOperator = {
  id: number
  uuid: string
  tenant: string | null
  userId: string
  displayName: string
  avatarAssetId: string
  customLabels: Array<string>
  avatarCp: TAvatarCp
  jobTitle: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type TChatChannel = {
  id: number
  uuid: string
  tenant: string
  displayName?: string | null
  chatCustomerId?: string | null
  chatOperatorId: string
  chatChannelName: string
  customLabels: Array<string>
  userId: string
  customerAccountId?: string
  chatStatus: 'waiting' | 'active' | 'closed' | 'resolved'
  chatStatusAt?: string | null
  chatStatusHistory?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  operatorDisplayName?: string
  clientDisplayName?: string
  userDisplayName?: string
}