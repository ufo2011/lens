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

import { EventEmitter } from "events";
import { onCorrect, onceCorrect } from "../type-enforced-ipc";

describe("type enforced ipc tests", () => {
  describe("onCorrect tests", () => {
    it("should call the handler if the args are valid", () => {
      let called = false;
      const source = new EventEmitter();
      const listener = () => called = true;
      const verifier = (args: unknown[]): args is [] => true;
      const channel = "foobar";

      onCorrect({ source, listener, verifier, channel });

      source.emit(channel);
      expect(called).toBe(true);
    });

    it("should not call the handler if the args are not valid", () => {
      let called = false;
      const source = new EventEmitter();
      const listener = () => called = true;
      const verifier = (args: unknown[]): args is [] => false;
      const channel = "foobar";

      onCorrect({ source, listener, verifier, channel });

      source.emit(channel);
      expect(called).toBe(false);
    });

    it("should call the handler twice if the args are valid on two emits", () => {
      let called = 0;
      const source = new EventEmitter();
      const listener = () => called += 1;
      const verifier = (args: unknown[]): args is [] => true;
      const channel = "foobar";

      onCorrect({ source, listener, verifier, channel });

      source.emit(channel);
      source.emit(channel);
      expect(called).toBe(2);
    });

    it("should call the handler twice if the args are [valid, invalid, valid]", () => {
      let called = 0;
      const source = new EventEmitter();
      const listener = () => called += 1;
      const results = [true, false, true];
      const verifier = (args: unknown[]): args is [] => results.pop();
      const channel = "foobar";

      onCorrect({ source, listener, verifier, channel });

      source.emit(channel);
      source.emit(channel);
      source.emit(channel);
      expect(called).toBe(2);
    });
  });

  describe("onceCorrect tests", () => {
    it("should call the handler if the args are valid", () => {
      let called = false;
      const source = new EventEmitter();
      const listener = () => called = true;
      const verifier = (args: unknown[]): args is [] => true;
      const channel = "foobar";

      onceCorrect({ source, listener, verifier, channel });

      source.emit(channel);
      expect(called).toBe(true);
    });

    it("should not call the handler if the args are not valid", () => {
      let called = false;
      const source = new EventEmitter();
      const listener = () => called = true;
      const verifier = (args: unknown[]): args is [] => false;
      const channel = "foobar";

      onceCorrect({ source, listener, verifier, channel });

      source.emit(channel);
      expect(called).toBe(false);
    });

    it("should call the handler only once even if args are valid multiple times", () => {
      let called = 0;
      const source = new EventEmitter();
      const listener = () => called += 1;
      const verifier = (args: unknown[]): args is [] => true;
      const channel = "foobar";

      onceCorrect({ source, listener, verifier, channel });

      source.emit(channel);
      source.emit(channel);
      expect(called).toBe(1);
    });

    it("should call the handler on only the first valid set of args", () => {
      let called = "";
      let verifierCalled = 0;
      const source = new EventEmitter();
      const listener = (info: any, arg: string) => called = arg;
      const verifier = (args: unknown[]): args is [string] => (++verifierCalled) % 3 === 0;
      const channel = "foobar";

      onceCorrect({ source, listener, verifier, channel });

      source.emit(channel, {}, "a");
      source.emit(channel, {}, "b");
      source.emit(channel, {}, "c");
      source.emit(channel, {}, "d");
      source.emit(channel, {}, "e");
      source.emit(channel, {}, "f");
      source.emit(channel, {}, "g");
      source.emit(channel, {}, "h");
      source.emit(channel, {}, "i");
      expect(called).toBe("c");
    });
  });
});
