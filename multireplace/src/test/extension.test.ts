import * as assert from 'assert';
import { applyReplacements } from '../extension';

suite('MultiReplace', () => {
	test('replaces every literal occurrence', () => {
		assert.strictEqual(
			applyReplacements('one + one = two', [{ search: 'one', replace: '1' }]),
			'1 + 1 = two'
		);
	});

	test('applies pairs in table order', () => {
		assert.strictEqual(
			applyReplacements('cat', [
				{ search: 'cat', replace: 'dog' },
				{ search: 'dog', replace: 'bird' }
			]),
			'bird'
		);
	});

	test('treats search values literally and ignores empty searches', () => {
		assert.strictEqual(
			applyReplacements('a.b ab', [
				{ search: '.', replace: '-' },
				{ search: '', replace: 'ignored' }
			]),
			'a-b ab'
		);
	});
});