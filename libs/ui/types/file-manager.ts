
import type { JSX } from 'react'

import { type ResourceProp } from './types'

type TypeCustomButton = {
    title: string;
    customButtonTitle?: string;
    icon: () => JSX.Element;
    // onClick?: () => void;
    onClick: (fullData: Array<TypeResourceItem> | null, onRefresh: () => void) => void;
};

type TypeCustomValueToEdit = {
    props: Array<ResourceProp>;
};

export type TypeCustomFolder = {
    key: string; // Уникальный ключ папки
    title: string; // Заголовок папки
    addButtonTitle: string; // Текст для кнопки "Добавить"
    editButtonTitle?: string; // Текст для кнопки "Редактировать" (опционально)
    icon: () => JSX.Element; // Функция, возвращающая иконку
    iconSmaller?: () => JSX.Element; // Функция, возвращающая меньшую версию иконки
    allowRecursive?: boolean; // отвечает за возможность создания такой же "папки" внутри самого себя
    allowFolders?: boolean; // отвечает за возможность создания ЛЮБЫХ ПАПОК ВНУТРИ
    allowCustomButtons?: boolean; // Разрешение на отображение кастомных кнопок
    customButtons?: Array<TypeCustomButton>; // Массив кастомных кнопок
    autoCreateSubFolders?: Array<{ path: string; displayName: string }>; // Автоматическое создание подпапок внутри созданного CustomFolder
    customValuesToEdit?: TypeCustomValueToEdit; // Доп. значения для редактирования
};

export type TypeCustomFolders = Array<TypeCustomFolder>;

export type TypeResourceItem = {
    resource_id?: string;
    path?: string;
    display_name?: string;
    additional_meta?: any
    [key: string]: any
}

export type TypeResourceDescription = {
    props: Array<ResourceProp>;
    uuidProp?: string;
    requiredProps?: Array<string>;
    needTenant?: boolean;
    [key: string]: any;
}
