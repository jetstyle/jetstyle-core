import { Fragment } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import {
  Italic,
  Bold,
  Heading1,
  Heading2,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  UnderlineIcon,
  Code,
  LucideHighlighter, Pilcrow, LayoutList, CodeSquare,
  Minus, WrapText, RemoveFormatting,
} from 'lucide-react'
import './style.scss'

const MenuItem = ({ icon, title, action, isActive= null }) => {
  return (
    <button
      className={`menu-item${isActive && isActive() ? ' is-active' : ''}`}
      onClick={action}
      title={title}
    >
      {icon}
    </button>
  )
}

const MenuBar = ({ editor }) => {
  const items = [
    {
      icon: <Bold size={18} />,
      title: 'Bold',
      action: (e) => { e.preventDefault()
        editor.chain().focus().toggleBold().run()},
      isActive: () => editor?.isActive('bold'),
    },
    {
      icon: <Italic size={18} />,
      title: 'Italic',
      action: (e) => { e.preventDefault()
        editor.chain().focus().toggleItalic().run()},
      isActive: () => editor?.isActive('italic'),
    },
    {
      icon: <UnderlineIcon size={18} />,
      title: 'Underline',
      action: (e) => { e.preventDefault()
        editor.chain().focus().toggleUnderline().run()},
      isActive: () => editor?.isActive('underline'),
    },
    {
      icon: <Strikethrough size={18}/>,
      title: 'Strike',
      action: (e) => { e.preventDefault()
        editor.chain().focus().toggleStrike().run()},
      isActive: () => editor?.isActive('strike'),
    },
    {
      icon: <Code size={18}/>,
      title: 'Code',
      action: (e) => { e.preventDefault()
        editor.chain().focus().toggleCode().run()},
      isActive: () => editor?.isActive('code'),
    },
    {
      icon: <LucideHighlighter size={18}/>,
      title: 'Highlight',
      action: (e) => { e.preventDefault()
        editor.chain().focus().toggleHighlight().run()},
      isActive: () => editor?.isActive('highlight'),
    },
    {
      type: 'divider',
    },
    {
      icon: <Heading1 size={18}/>,
      title: 'Heading 1',
      action: (e) => { e.preventDefault()
        editor.chain().focus().toggleHeading({ level: 1 }).run()},
      isActive: () => editor?.isActive('heading', { level: 1 }),
    },
    {
      icon: <Heading2 size={18}/>,
      title: 'Heading 2',
      action: (e) => { e.preventDefault()
        editor.chain().focus().toggleHeading({ level: 2 }).run()},
      isActive: () => editor?.isActive('heading', { level: 2 }),
    },
    {
      icon: <Pilcrow size={18}/>,
      title: 'Paragraph',
      action: (e) => { e.preventDefault()
        editor.chain().focus().setParagraph().run()},
      isActive: () => editor?.isActive('paragraph'),
    },
    {
      icon: <List size={18}/>,
      title: 'Bullet List',
      action: (e) => { e.preventDefault()
        editor.chain().focus().toggleBulletList().run()},
      isActive: () => editor?.isActive('bulletList'),
    },
    {
      icon: <ListOrdered size={18}/>,
      title: 'Ordered List',
      action: (e) => { e.preventDefault()
        editor.chain().focus().toggleOrderedList().run()},
      isActive: () => editor?.isActive('orderedList'),
    },
    {
      icon: <LayoutList size={18}/>,
      title: 'Task List',
      action: (e) => { e.preventDefault()
        editor.chain().focus().toggleTaskList().run()},
      isActive: () => editor?.isActive('taskList'),
    },
    {
      icon: <CodeSquare size={18}/>,
      title: 'Code Block',
      action: (e) => { e.preventDefault()
        editor.chain().focus().toggleCodeBlock().run()},
      isActive: () => editor?.isActive('codeBlock'),
    },
    {
      type: 'divider',
    },
    {
      icon: <Quote size={18} strokeWidth={2}/>,
      title: 'Blockquote',
      action: (e) => { e.preventDefault()
        editor.chain().focus().toggleBlockquote().run()},
      isActive: () => editor?.isActive('blockquote'),
    },
    {
      icon: <Minus size={18}/>,
      title: 'Horizontal Rule',
      action: (e) => { e.preventDefault()
        editor?.chain().focus().setHorizontalRule().run()},
    },
    {
      type: 'divider',
    },
    {
      icon: <WrapText size={18}/>,
      title: 'Hard Break',
      action: (e) => { e.preventDefault()
        editor?.chain().focus().setHardBreak().run()},
    },
    {
      icon: <RemoveFormatting size={18}/>,
      title: 'Clear Format',
      action: (e) => { e.preventDefault()
        editor?.chain().focus().clearNodes().unsetAllMarks().run()},
    },
    {
      type: 'divider',
    },
    {
      icon: <Undo size={18}/>,
      title: 'Undo',
      action: (e) => { e.preventDefault()
        editor.chain().focus().undo().run()}
    },
    {
      icon: <Redo size={18}/>,
      title: 'Redo',
      action: (e) => { e.preventDefault()
        editor?.chain().focus().redo().run()},
    }
  ]

  return (
    <div className="editor__header">
      {items.map((item, index) => (
        <Fragment key={index}>
          {item.type === 'divider' ? <div className="dividerType" /> : <MenuItem {...item} />}
        </Fragment>
      ))}
    </div>
  )
}

export const Tiptap = ({ setHtml, htmlContent }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      TaskList,
      TaskItem,
      Underline,
    ],
    content: htmlContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setHtml(html)
    },
  })

  // // useEffect(() => {
  //     setTimeout(() => {
  //         console.log('localStorage')
  //         localStorage.setItem("htmlContent", htmlContent);
  //     }, 5000);
  // // }, []);
  //
  // const addLastContent = () => {
  //     const test = localStorage.getItem("htmlContent");
  //
  //     console.log('test',test)
  //     if (test) {
  //         setHtml(test);
  //     }
  // }
  //
  // console.log('htmlContent',htmlContent)

  return (
    <div className="editor" >
      { editor && <MenuBar editor={editor} /> }
      <EditorContent className="editor__content" editor={editor} />
      {/*<button onClick={addLastContent}>Прошлый текст</button>*/}
    </div>
  )
}
