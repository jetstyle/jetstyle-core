import { translit } from './helpers'
import { type ResourceDescription } from '../types/types'

export const HTML_DESCRIPTION: ResourceDescription = {
  requiredProps: ['name'],
  props: [
    {
      propName: 'displayName',
      propType: 'string',
      nameFromApi: 'display_name',
    },
    {
      propName: 'name',
      propType: 'string',
      propDerived: {
        derivedFromProps: ['displayName' ],
        derivedFunc: (props) => {
          return translit(props?.displayName ?? '')
        },
      },
      nameFromApi: 'path',
    }
  ]
}

export const JSON_DESCRIPTION: ResourceDescription = {
  requiredProps: ['name'],
  props: [
    {
      propName: 'displayName',
      propType: 'string',
      nameFromApi: 'display_name',
    },
    {
      propName: 'name',
      propType: 'string',
      propDerived: {
        derivedFromProps: ['displayName' ],
        derivedFunc: (props) => {
          return translit(props?.displayName ?? '')
        },
      },
      nameFromApi: 'path',
    }
  ]
}

export const VOICE_DESCRIPTION: ResourceDescription = {
  requiredProps: ['name'],
  props: [
    {
      propName: 'displayName',
      propType: 'string',
      nameFromApi: 'display_name',
    },
    {
      propName: 'name',
      propType: 'string',
      propDerived: {
        derivedFromProps: ['displayName' ],
        derivedFunc: (props) => {
          return translit(props?.displayName ?? '')
        },
      },
      nameFromApi: 'path',
    }
  ]
}

export const FILE_DESCRIPTION: ResourceDescription = {
  requiredProps: ['name'],
  props: [
    {
      propName: 'displayName',
      propType: 'string',
    },
    {
      propName: 'name',
      propType: 'string',
      propDerived: {
        derivedFromProps: ['displayName'],
        derivedFunc: (props) => {
          return translit(props?.displayName ?? '')
        },
      },
    },
    {
      propName: 'file',
      propType: 'file',
    },
    // {
    //   propName: 'mimetype',
    //   propType: 'select',
    //   propOptions: [
    //     {
    //       value: '',
    //       label: '',
    //     }
    //   ],
    // },
    // {
    //   propName: 'content',
    //   propType: 'text',
    // }
  ]
}

export const DIR_DESCRIPTION: ResourceDescription = {
  requiredProps: ['name'],
  props: [
    {
      propName: 'displayName',
      propType: 'string',
      nameFromApi: 'display_name',
    },
    {
      propName: 'description',
      propType: 'string',
      nameFromApi: 'additional_meta.description',
    },
    {
      propName: 'name',
      propType: 'string',
      propDerived: {
        derivedFromProps: ['displayName'],
        derivedFunc: (props) => {
          return translit(props?.displayName ?? '')
        },
      },
      nameFromApi: 'path',
    }
  ]
}

export const ITEM_DESCRIPTION: ResourceDescription = {
  uuidProp: 'resource_id',
  props: [
    {
      propName: 'path',
      propType: 'string',
    },
    {
      propName: 'conversionStatus',
      propType: 'string',
    },
    {
      propName: 'display_name',
      propType: 'string',
    },
    {
      propName: 'mime_type',
      propType: 'string',
    },
    {
      propName: 'created_at',
      propType: 'datetime',
    },
    {
      propName: 'updated_at',
      propType: 'datetime',
    }
  ]
}

export const SYMLINK_FORM_ITEM_DESCRIPTION: ResourceDescription = {
  uuidProp: 'resource_id',
  requiredProps: ['name'],
  props: [
    {
      propName: 'display_name',
      propType: 'string',
    }
  ]
}

export const ARCHIVE_MIME_TYPES = [
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-bzip2',
  'application/x-xz',
  'application/x-iso9660-image',
  'application/vnd.ms-cab-compressed',
  'application/x-lzh-compressed',
  'application/x-ace-compressed',
  'application/vnd.android.package-archive',
  'application/x-arj',
  'application/x-compress',
  'application/x-cpio',
  'application/x-zip-compressed',
]

export const STATUS_CLASS_MAP = {
  'in-progress': 'badge-info',
  'success': 'badge-success',
  'error': 'badge-error',
}
