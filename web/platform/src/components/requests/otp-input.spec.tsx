import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OtpInput } from "./otp-input";

function boxes() {
  return Array.from({ length: 6 }, (_, i) =>
    screen.getByLabelText(`Digit ${i + 1} of 6`),
  );
}

function hiddenValue(container: HTMLElement) {
  return container.querySelector<HTMLInputElement>('input[name="code"]')!
    .value;
}

describe("OtpInput", () => {
  it("advances focus as each digit is typed and submits them as one value", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpInput name="code" />);

    await user.click(boxes()[0]);
    await user.keyboard("1234");

    expect(boxes()[4]).toHaveFocus();
    expect(hiddenValue(container)).toBe("1234");
  });

  it("ignores non-digit keys", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpInput name="code" />);

    await user.click(boxes()[0]);
    await user.keyboard("a-");

    expect(boxes()[0]).toHaveValue("");
    expect(boxes()[0]).toHaveFocus();
    expect(hiddenValue(container)).toBe("");
  });

  it("spreads a pasted code across the boxes", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpInput name="code" />);

    await user.click(boxes()[0]);
    await user.paste("123456");

    expect(boxes().map((b) => (b as HTMLInputElement).value)).toEqual([
      "1", "2", "3", "4", "5", "6",
    ]);
    expect(boxes()[5]).toHaveFocus();
    expect(hiddenValue(container)).toBe("123456");
  });

  it("drops pasted digits that don't fit in the remaining boxes", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpInput name="code" />);

    await user.click(boxes()[4]);
    await user.paste("789");

    expect(hiddenValue(container)).toBe("78");
  });

  it("moves back to the previous box on backspace in an empty box", async () => {
    const user = userEvent.setup();
    render(<OtpInput name="code" />);

    await user.click(boxes()[0]);
    await user.keyboard("1");
    await user.keyboard("{Backspace}");

    expect(boxes()[0]).toHaveFocus();
  });

  it("moves between boxes with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<OtpInput name="code" />);

    await user.click(boxes()[2]);
    await user.keyboard("{ArrowRight}");
    expect(boxes()[3]).toHaveFocus();

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(boxes()[1]).toHaveFocus();
  });

  it("reports changes and reflects the value when controlled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState("12");
      return (
        <OtpInput
          name="code"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }
    const { container } = render(<Controlled />);

    expect(hiddenValue(container)).toBe("12");

    await user.click(boxes()[2]);
    await user.keyboard("3");

    expect(onChange).toHaveBeenLastCalledWith("123");
    expect(hiddenValue(container)).toBe("123");
  });
});
