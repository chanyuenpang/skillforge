#!/usr/bin/env node

import assert from "node:assert/strict";
import { validateSchema, getSchema, schemaRegistry } from "../src/skillforge/schema.mjs";

function makeValidWorkflowSource() {
  return {
    fixtureId: "meeting-summary-assistant",
    fixtureVersion: "0.1.0",
    kind: "workflow-source",
    name: "会议纪要整理助手工作流",
    summary: "将公开或虚构会议记录整理为结构化纪要。",
    source: {
      type: "public-fictional-sample",
      language: "zh-CN",
      inputContract: {
        acceptedInputs: ["公开会议记录文本"],
        rejectedInputs: ["真实访问令牌或密钥"],
      },
      outputContract: {
        format: "markdown",
        sections: ["meetingTitle"],
      },
    },
    permissions: {
      network: false,
      externalSend: false,
      fileRead: false,
      fileWrite: false,
      destructiveOperations: false,
      privatePathRead: false,
    },
    checklist: {
      structure: "ok",
      trigger: "ok",
      boundary: "ok",
      dependency: "ok",
      replay: "ok",
      privacy: "ok",
      compatibility: "ok",
    },
  };
}

function assertInvalid(result, label, expectedField) {
  assert.equal(result.valid, false, `${label} should be invalid`);
  assert.ok(Array.isArray(result.errors), `${label} should return errors array`);
  assert.ok(result.errors.some((error) => error.field === expectedField), `${label} should include ${expectedField}`);
}

function main() {
  assert.ok(schemaRegistry["workflow-source"], "workflow-source schema should be registered");
  assert.equal(getSchema("workflow-source")?.name, "workflow-source", "workflow-source schema lookup should work");

  const positive = validateSchema("workflow-source", makeValidWorkflowSource());
  assert.equal(positive.valid, true, "positive workflow-source should pass");
  assert.equal(positive.errors.length, 0, "positive workflow-source should have no errors");

  const missingRequired = makeValidWorkflowSource();
  delete missingRequired.name;
  assertInvalid(validateSchema("workflow-source", missingRequired), "missing required name", "name");

  const typeMismatch = makeValidWorkflowSource();
  typeMismatch.source.inputContract.acceptedInputs = "公开会议记录文本";
  assertInvalid(
    validateSchema("workflow-source", typeMismatch),
    "type mismatch acceptedInputs",
    "source.inputContract.acceptedInputs",
  );

  const illegalEnum = makeValidWorkflowSource();
  illegalEnum.source.type = "private-corp-source";
  assertInvalid(validateSchema("workflow-source", illegalEnum), "illegal source.type", "source.type");

  const invalidProfile = makeValidWorkflowSource();
  invalidProfile.profile = "enterprise";
  assertInvalid(validateSchema("workflow-source", invalidProfile), "illegal profile", "profile");

  console.log("workflow-source contract tests passed.");
}

main();
