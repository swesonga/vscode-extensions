import * as assert from 'assert';
import { applyReplacements, getDuplicateSearchValues, getUniqueReplacementPairs } from '../extension';

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

	test('removes duplicate search values while preserving first occurrence order', () => {
		assert.deepStrictEqual(
			getUniqueReplacementPairs([
				{ search: 'one', replace: '1' },
				{ search: 'two', replace: '2' },
				{ search: 'one', replace: '1' },
				{ search: 'one', replace: 'first' }
			]),
			[
				{ search: 'one', replace: '1' },
				{ search: 'two', replace: '2' }
			]
		);
	});

	test('reports each duplicate search value once', () => {
		assert.deepStrictEqual(
			getDuplicateSearchValues([
				{ search: 'one', replace: '1' },
				{ search: 'two', replace: '2' },
				{ search: 'one', replace: 'first' },
				{ search: 'one', replace: 'single' },
				{ search: 'ONE', replace: 'uppercase' },
				{ search: 'two', replace: 'second' }
			]),
			['one', 'two']
		);
	});

	test('rejects malformed imported data', () => {
		assert.throws(
			() => getUniqueReplacementPairs([{ search: 'one' }]),
			/string "search" and "replace" properties/
		);
	});
});