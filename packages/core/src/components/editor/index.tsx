'use client'
import type { EditorContainer } from '@blocksuite/presets'
import { assertExists } from '@blocksuite/global/utils'
import type { Page } from '@blocksuite/store'
import type { CSSProperties, ReactElement } from 'react'
import { memo, useEffect, useRef, useCallback } from 'react'
import { useSingleton } from 'foxact/use-singleton'
import { atom } from 'jotai/vanilla'
import { useAtomValue } from 'jotai/react'

const editorContainerAtom = atom(() => import('@blocksuite/presets').then(
  m => m.EditorContainer))

export type EditorProps = {
  page: Page;
  mode: 'page' | 'edgeless';
  onLoad?: (page: Page, editor: EditorContainer) => () => void;
  style?: CSSProperties;
  className?: string;
};

const BlockSuiteEditorImpl = (props: EditorProps): ReactElement => {
  const { onLoad, page, mode, style } = props
  assertExists(page, 'page should not be null')
  const EditorContainer = useAtomValue(editorContainerAtom)
  const editorRef = useSingleton(() => {
    const editor = new EditorContainer()
    editor.autofocus = true
    return editor
  })
  const editor = editorRef.current
  if (editor.mode !== mode) {
    editor.mode = mode
  }

  if (editor.page !== page) {
    editor.page = page
  }

  useEffect(() => {
    if (editor.page && onLoad) {
      const disposes = [] as ((() => void) | undefined)[]
      disposes.push(onLoad?.(page, editor))
      return () => {
        disposes.filter((dispose): dispose is () => void => !!dispose).
          forEach(dispose => dispose())
      }
    }
    return
  }, [editor, editor.page, page, onLoad])

  const containerRef = useRef<HTMLDivElement>()

  return (
    <div
      className={props.className}
      style={style}
      ref={useCallback((container: HTMLDivElement | null) => {
        const editor = editorRef.current
        if (container && editor) {
          container.appendChild(editor)
          containerRef.current = container
        } else {
          (containerRef.current as HTMLDivElement).removeChild(editor)
        }
      }, [editorRef])}
    />
  )
}

export const BlockSuiteEditor = memo(function BlockSuiteEditor (
  props: EditorProps
): ReactElement {
  return (
    <BlockSuiteEditorImpl {...props} />
  )
})

BlockSuiteEditor.displayName = 'BlockSuiteEditor'
