/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { isEmail, isUrl, systemName } from "../input_validators";

type TextValidationCase = [string, boolean];

describe("input validation tests", () => {
  describe("isEmail tests", () => {
    const tests: TextValidationCase[] = [
      ["abc@news.com", true],
      ["abc@news.co.uk", true],
      ["abc1.3@news.co.uk", true],
      ["abc1.3@news.name", true],
      ["@news.com", false],
      ["abcnews.co.uk", false],
      ["abc1.3@news", false],
      ["abc1.3@news.name.a.b.c.d.d", false],
    ];

    it.each(tests)("validate %s", (input, output) => {
      expect(isEmail.validate(input)).toBe(output);
    });
  });

  describe("isUrl tests", () => {
    const cases: TextValidationCase[] = [
      ["https://github-production-registry-package-file-4f11e5.s3.amazonaws.com/307985088/68bbbf00-309f-11eb-8457-a15e4efe9e77?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIWNJYAX4CSVEH53A%2F20201127%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20201127T123754Z&X-Amz-Expires=300&X-Amz-Signature=9b8167f00685a20d980224d397892195abc187cdb2934cefb79edcd7ec600f78&X-Amz-SignedHeaders=host&actor_id=0&key_id=0&repo_id=0&response-content-disposition=filename%3Dstarboard-lens-extension-0.0.1-alpha.1-npm.tgz&response-content-type=application%2Foctet-stream", true],
      ["google.ca", false],
      ["", false],
      [".", false],
      ["google.askdgjkhsadjkhdas.dsakljsd", false],
      ["https://google.com", true],
      ["https://example.org", true],
      ["https://www.example.org", true],
    ];

    it.each(cases)("validate %s", (input, output) => {
      expect(isUrl.validate(input)).toBe(output);
    });
  });

  describe("systemName tests", () => {
    const tests: TextValidationCase[] = [
      ["a", true],
      ["ab", true],
      ["abc", true],
      ["1", true],
      ["12", true],
      ["123", true],
      ["1a2", true],
      ["1-2", true],
      ["1---------------2", true],
      ["1---------------2.a", true],
      ["1---------------2.a.1", true],
      ["1---------------2.9-a.1", true],
      ["", false],
      ["-", false],
      [".", false],
      ["as.", false],
      [".asd", false],
      ["a.-", false],
      ["a.1-", false],
      ["o.2-2.", false],
      ["o.2-2....", false],
    ];

    it.each(tests)("validate %s", (input, output) => {
      expect(systemName.validate(input)).toBe(output);
    });
  });
});
