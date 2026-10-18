"use client";

import { useMemo, useState } from "react";
import { PlayCourt } from "@/components/practice/play-court";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import { clonePositions, createEmptyDiagram, createEmptyStep } from "@/lib/play-diagram/defaults";
import type { PlayDiagram, PlayDiagramAction, PlayPlayerId } from "@/types/play-diagram";
import { PLAY_PLAYER_IDS } from "@/types/play-diagram";

type DiagramEditorProps = {
  name: string;
  defaultDiagram: PlayDiagram | null;
  disabled?: boolean;
};

type ActionKind = "none" | "pass" | "shoot";

export function DiagramEditor({ name, defaultDiagram, disabled }: DiagramEditorProps) {
  const [enabled, setEnabled] = useState(Boolean(defaultDiagram));
  const [diagram, setDiagram] = useState<PlayDiagram>(() => defaultDiagram ?? createEmptyDiagram());
  const [stepIndex, setStepIndex] = useState(0);
  const [passPick, setPassPick] = useState<"from" | "to" | null>(null);

  const step = diagram.steps[stepIndex] ?? diagram.steps[0]!;

  const actionKind: ActionKind = step.action?.type ?? "none";
  const serialized = useMemo(() => (enabled ? JSON.stringify(diagram) : ""), [enabled, diagram]);

  const updateStep = (patch: Partial<typeof step>) => {
    setDiagram((prev) => {
      const steps = prev.steps.map((s, i) => (i === stepIndex ? { ...s, ...patch } : s));
      return { ...prev, steps };
    });
  };

  const setAction = (kind: ActionKind) => {
    if (kind === "none") {
      updateStep({ action: undefined });
      setPassPick(null);
      return;
    }
    if (kind === "shoot") {
      updateStep({ action: { type: "shoot", shooter: step.ballHolder }, ballHolder: step.ballHolder });
      setPassPick(null);
      return;
    }
    const from = step.ballHolder;
    const to = (PLAY_PLAYER_IDS.find((id) => id !== from) ?? "2") as PlayPlayerId;
    updateStep({ action: { type: "pass", from, to }, ballHolder: to });
    setPassPick("to");
  };

  const onTapPlayer = (id: PlayPlayerId) => {
    if (disabled || !enabled) return;
    if (passPick === "from" && step.action?.type === "pass") {
      const action: PlayDiagramAction = { type: "pass", from: id, to: step.action.to === id ? step.ballHolder : step.action.to };
      updateStep({ action, ballHolder: action.to });
      setPassPick("to");
      return;
    }
    if (passPick === "to" && step.action?.type === "pass") {
      updateStep({ action: { type: "pass", from: step.action.from, to: id }, ballHolder: id });
      setPassPick(null);
      return;
    }
    if (actionKind === "shoot") {
      updateStep({ action: { type: "shoot", shooter: id }, ballHolder: id });
      return;
    }
    updateStep({ ballHolder: id });
  };

  const addStep = () => {
    const base = createEmptyStep(he.training.practice.newStepCaption);
    base.positions = clonePositions(step.positions);
    base.ballHolder = step.ballHolder;
    setDiagram((prev) => ({ ...prev, steps: [...prev.steps, base] }));
    setStepIndex(diagram.steps.length);
    setPassPick(null);
  };

  const removeStep = () => {
    if (diagram.steps.length <= 1) return;
    setDiagram((prev) => {
      const steps = prev.steps.filter((_, i) => i !== stepIndex);
      return { ...prev, steps };
    });
    setStepIndex((i) => Math.max(0, Math.min(i, diagram.steps.length - 2)));
    setPassPick(null);
  };

  const enable = () => {
    setEnabled(true);
    if (!defaultDiagram) setDiagram(createEmptyDiagram());
  };

  const clear = () => {
    setEnabled(false);
    setDiagram(createEmptyDiagram());
    setStepIndex(0);
    setPassPick(null);
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={serialized} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold">{he.admin.exerciseForm.diagram}</h3>
          <p className="text-sm text-muted">{he.admin.exerciseForm.diagramHint}</p>
        </div>
        {enabled ? (
          <Button type="button" variant="danger" size="sm" disabled={disabled} onClick={clear}>
            {he.admin.exerciseForm.diagramRemove}
          </Button>
        ) : (
          <Button type="button" size="sm" disabled={disabled} onClick={enable}>
            {he.admin.exerciseForm.diagramAdd}
          </Button>
        )}
      </div>

      {enabled ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={disabled || stepIndex === 0} onClick={() => setStepIndex((i) => i - 1)}>
              {he.actions.previous}
            </Button>
            <span className="text-sm text-muted">
              {he.training.practice.stepLabel}{" "}
              <bdi dir="ltr" className="num">
                {stepIndex + 1}/{diagram.steps.length}
              </bdi>
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={disabled || stepIndex >= diagram.steps.length - 1}
              onClick={() => setStepIndex((i) => i + 1)}
            >
              {he.actions.next}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={addStep}>
              {he.admin.exerciseForm.diagramAddStep}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={disabled || diagram.steps.length <= 1} onClick={removeStep}>
              {he.admin.exerciseForm.diagramRemoveStep}
            </Button>
          </div>

          <PlayCourt
            positions={step.positions}
            ballHolder={step.ballHolder}
            interactive={!disabled}
            selectedId={passPick ? (step.action?.type === "pass" ? (passPick === "from" ? step.action.from : step.action.to) : null) : null}
            onDragPlayer={(id, point) => updateStep({ positions: { ...step.positions, [id]: point } })}
            onTapPlayer={onTapPlayer}
          />

          <p className="text-xs text-muted">{he.admin.exerciseForm.diagramEditHint}</p>

          <Field label={he.admin.exerciseForm.diagramCaption} htmlFor="diagram-caption">
            <Input
              id="diagram-caption"
              value={step.caption}
              disabled={disabled}
              data-user-content
              onChange={(e) => updateStep({ caption: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={he.admin.exerciseForm.diagramAction} htmlFor="diagram-action">
              <Select
                id="diagram-action"
                value={actionKind}
                disabled={disabled}
                onChange={(e) => setAction(e.target.value as ActionKind)}
              >
                <option value="none">{he.admin.exerciseForm.diagramActionNone}</option>
                <option value="pass">{he.admin.exerciseForm.diagramActionPass}</option>
                <option value="shoot">{he.admin.exerciseForm.diagramActionShoot}</option>
              </Select>
            </Field>
            {actionKind === "pass" && step.action?.type === "pass" ? (
              <div className="flex flex-wrap items-end gap-2">
                <Button type="button" size="sm" variant={passPick === "from" ? "primary" : "secondary"} disabled={disabled} onClick={() => setPassPick("from")}>
                  {he.admin.exerciseForm.diagramPickFrom(step.action.from)}
                </Button>
                <Button type="button" size="sm" variant={passPick === "to" ? "primary" : "secondary"} disabled={disabled} onClick={() => setPassPick("to")}>
                  {he.admin.exerciseForm.diagramPickTo(step.action.to)}
                </Button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
