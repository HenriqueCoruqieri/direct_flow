"use client"

import { Input } from "@/app/_components/ui/input"

interface MaskedInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> {
  value: string
  onChange: (value: string) => void
  clean: (value: string) => string
  format: (clean: string) => string
}

interface MaskedEdit {
  text: string
  caret: number
}

type Clean = (value: string) => string

const keptCount = (clean: Clean, text: string, end: number): number =>
  clean(text.slice(0, end)).length

const isKeptAt = (clean: Clean, text: string, index: number): boolean =>
  keptCount(clean, text, index + 1) > keptCount(clean, text, index)

const removeAt = (text: string, index: number): MaskedEdit => ({
  text: `${text.slice(0, index)}${text.slice(index + 1)}`,
  caret: index,
})

const removeKeptBefore = (clean: Clean, edit: MaskedEdit): MaskedEdit => {
  for (let index = edit.caret - 1; index >= 0; index -= 1) {
    if (isKeptAt(clean, edit.text, index)) return removeAt(edit.text, index)
  }
  return edit
}

const removeKeptAfter = (clean: Clean, edit: MaskedEdit): MaskedEdit => {
  for (let index = edit.caret; index < edit.text.length; index += 1) {
    if (isKeptAt(clean, edit.text, index)) return removeAt(edit.text, index)
  }
  return edit
}

const caretAfterKept = (clean: Clean, text: string, count: number): number => {
  for (let index = 0; index <= text.length; index += 1) {
    if (keptCount(clean, text, index) >= count) return index
  }
  return text.length
}

const inputTypeOf = (event: React.ChangeEvent<HTMLInputElement>): string =>
  event.nativeEvent instanceof InputEvent ? event.nativeEvent.inputType : ""

const MaskedInput = ({
  value,
  onChange,
  clean,
  format,
  inputMode = "numeric",
  ...props
}: MaskedInputProps) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    let edit: MaskedEdit = {
      text: input.value,
      caret: input.selectionStart ?? input.value.length,
    }

    const removedOnlyMask =
      edit.text.length < value.length &&
      clean(edit.text).length === clean(value).length
    if (removedOnlyMask) {
      const inputType = inputTypeOf(event)
      if (inputType === "deleteContentBackward") {
        edit = removeKeptBefore(clean, edit)
      } else if (inputType === "deleteContentForward") {
        edit = removeKeptAfter(clean, edit)
      }
    }

    const keptBeforeCaret = keptCount(clean, edit.text, edit.caret)
    const formatted = format(clean(edit.text))
    const caret = caretAfterKept(clean, formatted, keptBeforeCaret)

    input.value = formatted
    input.setSelectionRange(caret, caret)
    onChange(formatted)
  }

  return (
    <Input
      {...props}
      type="text"
      autoComplete="off"
      inputMode={inputMode}
      value={value}
      onChange={handleChange}
    />
  )
}

export default MaskedInput
