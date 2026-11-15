import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { useForm } from "react-hook-form"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form"
import { Input } from "./input"

function TestForm() {
  const form = useForm({ defaultValues: { name: "" } })

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

describe("FormItem", () => {
  it("packs its rows at the top so a stretched item does not push its content down", () => {
    const { container } = render(<TestForm />)
    const item = container.querySelector('[data-slot="form-item"]')

    expect(item).not.toBeNull()
    expect(item?.classList.contains("content-start")).toBe(true)
  })
})
