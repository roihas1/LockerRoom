"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { he } from "@/config/strings";

export function StringListField({
  name,
  label,
  defaultItems,
  disabled,
  error,
  hint,
}: {
  name: string;
  label: string;
  defaultItems: string[];
  disabled?: boolean;
  error?: string;
  hint?: string;
}) {
  const [items, setItems] = useState(() => (defaultItems.length > 0 ? defaultItems : [""]));

  return (
    <Field label={label} error={error} hint={hint}>
      <div className="space-y-2">
        {items.map((value, index) => (
          <div key={index} className="flex gap-2">
            <Input
              name={name}
              defaultValue={value}
              disabled={disabled}
              data-user-content
              aria-label={`${label} ${index + 1}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || items.length <= 1}
              onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
            >
              {he.admin.exerciseForm.removeItem}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => setItems((prev) => [...prev, ""])}
        >
          {he.admin.exerciseForm.addItem}
        </Button>
      </div>
    </Field>
  );
}
