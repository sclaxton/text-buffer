const Random = require('random-seed')
const dedent = require('dedent')
const TextBuffer = require('../src/text-buffer')
const Point = require('../src/point')
const Range = require('../src/range')

const {isEqual: isEqualPoint, compare: comparePoints, traverse} = require('../src/point-helpers')

const WORDS = require('./helpers/words')
const SAMPLE_TEXT = require('./helpers/sample-text')
const TestDecorationLayer = require('./helpers/test-decoration-layer')

describe('DisplayLayer', () => {
  beforeEach(() => {
    return jasmine.addCustomEqualityTester(require('underscore-plus').isEqual)
  })

  describe('copy()', () => {
    it('creates a new DisplayLayer having the same settings', () => {
      const buffer = new TextBuffer({
        text: SAMPLE_TEXT
      })

      const displayLayer1 = buffer.addDisplayLayer({
        invisibles: {
          eol: 'X'
        },
        tabLength: 3,
        softWrapColumn: 20,
        softWrapHangingIndent: 2,
        showIndentGuides: true,
        foldCharacter: 'Y',
        atomicSoftTabs: false,
        ratioForCharacter: () => 3,
        isWrapBoundary: () => false
      })

      displayLayer1.foldBufferRange(Range(Point(0, 1), Point(1, 1)))
      const displayLayer2 = displayLayer1.copy()
      expect(displayLayer2.getText()).toBe(displayLayer1.getText())
      expect(displayLayer2.foldsMarkerLayer.getMarkers().length).toBe(displayLayer1.foldsMarkerLayer.getMarkers().length)
      expect(displayLayer2.invisibles).toEqual(displayLayer1.invisibles)
      expect(displayLayer2.tabLength).toEqual(displayLayer1.tabLength)
      expect(displayLayer2.softWrapColumn).toEqual(displayLayer1.softWrapColumn)
      expect(displayLayer2.softWrapHangingIndent).toEqual(displayLayer1.softWrapHangingIndent)
      expect(displayLayer2.showIndentGuides).toEqual(displayLayer1.showIndentGuides)
      expect(displayLayer2.foldCharacter).toEqual(displayLayer1.foldCharacter)
      expect(displayLayer2.atomicSoftTabs).toEqual(displayLayer1.atomicSoftTabs)
      expect(displayLayer2.ratioForCharacter).toBe(displayLayer1.ratioForCharacter)
      expect(displayLayer2.isWrapBoundary).toBe(displayLayer1.isWrapBoundary)
    })
  })

  describe('hard tabs', () => {
    it('expands hard tabs to their tab stops', () => {
      const buffer = new TextBuffer({
        text: '\ta\tbc\tdef\tg\n\th'
      })

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 4
      })

      expect(displayLayer.getText()).toBe('    a   bc  def g\n    h')

      expectTokenBoundaries(displayLayer, [{
        text: '    ',
        close: [],
        open: ['hard-tab leading-whitespace']
      }, {
        text: 'a',
        close: ['hard-tab leading-whitespace'],
        open: []
      }, {
        text: '   ',
        close: [],
        open: ['hard-tab']
      }, {
        text: 'bc',
        close: ['hard-tab'],
        open: []
      }, {
        text: '  ',
        close: [],
        open: ['hard-tab']
      }, {
        text: 'def',
        close: ['hard-tab'],
        open: []
      }, {
        text: ' ',
        close: [],
        open: ['hard-tab']
      }, {
        text: 'g',
        close: ['hard-tab'],
        open: []
      }, {
        text: '    ',
        close: [],
        open: ['hard-tab leading-whitespace']
      }, {
        text: 'h',
        close: ['hard-tab leading-whitespace'],
        open: []
      }])

      expectPositionTranslations(displayLayer, [
        [Point(0, 0), Point(0, 0)],
        [Point(0, 1), [Point(0, 0), Point(0, 1)]],
        [Point(0, 2), [Point(0, 0), Point(0, 1)]],
        [Point(0, 3), [Point(0, 0), Point(0, 1)]],
        [Point(0, 4), Point(0, 1)],
        [Point(0, 5), Point(0, 2)],
        [Point(0, 6), [Point(0, 2), Point(0, 3)]],
        [Point(0, 7), [Point(0, 2), Point(0, 3)]],
        [Point(0, 8), Point(0, 3)],
        [Point(0, 9), Point(0, 4)],
        [Point(0, 10), Point(0, 5)],
        [Point(0, 11), [Point(0, 5), Point(0, 6)]],
        [Point(0, 12), Point(0, 6)],
        [Point(0, 13), Point(0, 7)],
        [Point(0, 14), Point(0, 8)],
        [Point(0, 15), Point(0, 9)],
        [Point(0, 16), Point(0, 10)],
        [Point(0, 17), Point(0, 11)],
        [Point(0, 18), [Point(0, 11), Point(1, 0)]],
        [Point(1, 0), Point(1, 0)],
        [Point(1, 1), [Point(1, 0), Point(1, 1)]],
        [Point(1, 2), [Point(1, 0), Point(1, 1)]],
        [Point(1, 3), [Point(1, 0), Point(1, 1)]],
        [Point(1, 4), Point(1, 1)],
        [Point(1, 5), Point(1, 2)],
        [Point(1, 6), [Point(1, 2), Point(1, 2)]]
      ])
    })
  })

  describe('soft tabs', () => {
    it('breaks leading whitespace into atomic units corresponding to the tab length', () => {
      const buffer = new TextBuffer({
        text: '          a\n     \n  \t    \t  '
      })

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 4,

        invisibles: {
          space: '•'
        }
      })

      expect(displayLayer.getText()).toBe('••••••••••a\n•••••\n••  ••••    ••')

      expectTokenBoundaries(displayLayer, [{
        text: '••••',
        close: [],
        open: ['invisible-character leading-whitespace']
      }, {
        text: '••••',
        close: ['invisible-character leading-whitespace'],
        open: ['invisible-character leading-whitespace']
      }, {
        text: '••',
        close: ['invisible-character leading-whitespace'],
        open: ['invisible-character leading-whitespace']
      }, {
        text: 'a',
        close: ['invisible-character leading-whitespace'],
        open: []
      }, {
        text: '••••',
        close: [],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '•',
        close: ['invisible-character trailing-whitespace'],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '',
        close: ['invisible-character trailing-whitespace'],
        open: []
      }, {
        text: '••',
        close: [],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '  ',
        close: ['invisible-character trailing-whitespace'],
        open: ['hard-tab trailing-whitespace']
      }, {
        text: '••••',
        close: ['hard-tab trailing-whitespace'],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '    ',
        close: ['invisible-character trailing-whitespace'],
        open: ['hard-tab trailing-whitespace']
      }, {
        text: '••',
        close: ['hard-tab trailing-whitespace'],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '',
        close: ['invisible-character trailing-whitespace'],
        open: []
      }])

      expect(displayLayer.clipScreenPosition([0, 2])).toEqual([0, 0])
      expect(displayLayer.clipScreenPosition([0, 6])).toEqual([0, 4])
      expect(displayLayer.clipScreenPosition([0, 9])).toEqual([0, 9])
      expect(displayLayer.clipScreenPosition([2, 1])).toEqual([2, 1])
      expect(displayLayer.clipScreenPosition([2, 6])).toEqual([2, 4])
      expect(displayLayer.clipScreenPosition([2, 13])).toEqual([2, 13])
    })

    it('does not treat soft tabs as atomic if the atomicSoftTabs option is false', () => {
      const buffer = new TextBuffer({
        text: '    a\n        b'
      })

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 4,
        atomicSoftTabs: false
      })

      expect(displayLayer.clipScreenPosition([0, 2])).toEqual([0, 2])
      expect(displayLayer.clipScreenPosition([1, 6])).toEqual([1, 6])
    })
  })

  describe('paired characters', () => {
    it('treats paired characters as atomic units', () => {
      const buffer = new TextBuffer({
        text: 'abc🐲def'
      })

      const displayLayer = buffer.addDisplayLayer()

      expectPositionTranslations(displayLayer, [
        [Point(0, 0), Point(0, 0)],
        [Point(0, 1), Point(0, 1)],
        [Point(0, 2), Point(0, 2)],
        [Point(0, 3), Point(0, 3)],
        [Point(0, 4), [Point(0, 3), Point(0, 5)]],
        [Point(0, 5), Point(0, 5)],
        [Point(0, 6), Point(0, 6)],
        [Point(0, 7), Point(0, 7)],
        [Point(0, 8), Point(0, 8)]
      ])
    })

    it("doesn't soft wrap when the wrap boundary is between two paired characters", () => {
      const buffer = new TextBuffer({
        text: 'abcde🐲fghij'
      })

      const displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 6
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('abcde🐲\nfghij'))
    })
  })

  describe('folds', () => {
    it('allows single folds to be created and destroyed', () => {
      const buffer = new TextBuffer({
        text: SAMPLE_TEXT
      })

      const displayLayer = buffer.addDisplayLayer()
      const foldId = displayLayer.foldBufferRange([[4, 29], [7, 4]])

      expect(displayLayer.getText()).toBe(dedent`
        var quicksort = function () {
          var sort = function(items) {
            if (items.length <= 1) return items;
            var pivot = items.shift(), current, left = [], right = [];
            while(items.length > 0) {⋯}
            return sort(left).concat(pivot).concat(sort(right));
          };

          return sort(Array.apply(this, arguments));
        };
      `)

      expect(displayLayer.clipScreenPosition([4, 29], {
        clipDirection: 'forward'
      })).toEqual([4, 29])

      expect(displayLayer.translateScreenPosition([4, 29], {
        clipDirection: 'forward'
      })).toEqual([4, 29])

      displayLayer.destroyFold(foldId)
      expect(displayLayer.getText()).toBe(SAMPLE_TEXT)
    })

    it('allows folds that contain other folds to be created and destroyed', () => {
      const buffer = new TextBuffer({
        text: 'abcd\nefgh\nijkl\nmnop'
      })

      const displayLayer = buffer.addDisplayLayer()
      displayLayer.foldBufferRange([[1, 1], [1, 3]])
      displayLayer.foldBufferRange([[2, 1], [2, 3]])
      const outerFoldId = displayLayer.foldBufferRange([[0, 1], [3, 3]])
      expect(displayLayer.getText()).toBe('a⋯p')
      displayLayer.destroyFold(outerFoldId)
      expect(displayLayer.getText()).toBe('abcd\ne⋯h\ni⋯l\nmnop')
    })

    it('allows folds contained within other folds to be created and destroyed', () => {
      const buffer = new TextBuffer({
        text: 'abcd\nefgh\nijkl\nmnop'
      })

      const displayLayer = buffer.addDisplayLayer()
      displayLayer.foldBufferRange([[0, 1], [3, 3]])
      const innerFoldAId = displayLayer.foldBufferRange([[1, 1], [1, 3]])
      const innerFoldBId = displayLayer.foldBufferRange([[2, 1], [2, 3]])
      expect(displayLayer.getText()).toBe('a⋯p')
      displayLayer.destroyFold(innerFoldAId)
      expect(displayLayer.getText()).toBe('a⋯p')
      displayLayer.destroyFold(innerFoldBId)
      expect(displayLayer.getText()).toBe('a⋯p')
    })

    it('allows multiple buffer lines to be collapsed to a single screen line by successive folds', () => {
      const buffer = new TextBuffer({
        text: 'abc\ndef\nghi\nj'
      })

      const displayLayer = buffer.addDisplayLayer()
      displayLayer.foldBufferRange([[0, 1], [1, 1]])
      displayLayer.foldBufferRange([[1, 2], [2, 1]])
      displayLayer.foldBufferRange([[2, 2], [3, 0]])
      expect(displayLayer.getText()).toBe('a⋯e⋯h⋯j')
    })

    it('unions folded ranges when folds overlap', () => {
      const buffer = new TextBuffer({
        text: 'abc\ndef\nghi\njkl\nmno'
      })

      const displayLayer = buffer.addDisplayLayer()
      displayLayer.foldBufferRange([[0, 1], [1, 2]])
      const foldBId = displayLayer.foldBufferRange([[1, 1], [2, 2]])
      const foldCId = displayLayer.foldBufferRange([[2, 1], [3, 0]])
      const foldDId = displayLayer.foldBufferRange([[3, 0], [4, 0]])
      expect(displayLayer.getText()).toBe('a⋯⋯mno')
      displayLayer.destroyFold(foldCId)
      expect(displayLayer.getText()).toBe('a⋯i\n⋯mno')
      displayLayer.destroyFold(foldBId)
      expect(displayLayer.getText()).toBe('a⋯f\nghi\n⋯mno')
      displayLayer.destroyFold(foldDId)
      expect(displayLayer.getText()).toBe('a⋯f\nghi\njkl\nmno')
    })

    it('allows folds intersecting a buffer range to be destroyed', () => {
      const buffer = new TextBuffer({
        text: 'abc\ndef\nghi\nj'
      })

      const displayLayer = buffer.addDisplayLayer()
      displayLayer.foldBufferRange([[0, 1], [1, 2]])
      displayLayer.foldBufferRange([[1, 1], [2, 2]])
      displayLayer.foldBufferRange([[2, 1], [3, 0]])
      displayLayer.foldBufferRange([[2, 2], [3, 0]])
      expect(displayLayer.getText()).toBe('a⋯j')

      verifyChangeEvent(displayLayer, () => {
        return displayLayer.destroyFoldsIntersectingBufferRange([[1, 1], [2, 1]])
      })

      expect(displayLayer.getText()).toBe('abc\ndef\ngh⋯j')
    })

    it('allows all folds to be destroyed', () => {
      const buffer = new TextBuffer({
        text: 'abc\ndef\nghi\nj'
      })

      const displayLayer = buffer.addDisplayLayer()
      displayLayer.foldBufferRange([[0, 1], [1, 2]])
      displayLayer.foldBufferRange([[1, 1], [2, 2]])
      displayLayer.foldBufferRange([[2, 1], [3, 0]])
      displayLayer.foldBufferRange([[2, 2], [3, 0]])
      expect(displayLayer.getText()).toBe('a⋯j')

      verifyChangeEvent(displayLayer, () => {
        return displayLayer.destroyAllFolds()
      })

      expect(displayLayer.getText()).toBe('abc\ndef\nghi\nj')
    })

    it('automatically destroy folds when they become invalid after a buffer change', () => {
      const buffer = new TextBuffer({
        text: 'abc def\nghi jkl\nmno pqr\nstu vwx'
      })

      const displayLayer = buffer.addDisplayLayer()
      displayLayer.foldBufferRange([[0, 1], [1, 2]])
      displayLayer.foldBufferRange([[1, 5], [2, 4]])
      displayLayer.foldBufferRange([[3, 0], [3, 3]])
      expect(displayLayer.getText()).toBe('a⋯i j⋯pqr\n⋯ vwx')
      buffer.insert([0, 3], 'y')
      expect(displayLayer.getText()).toBe('a⋯i j⋯pqr\n⋯ vwx')
      buffer.setTextInRange([[1, 6], [3, 4]], 'z')
      expect(displayLayer.getText()).toBe('a⋯i jkzvwx')
      expect(displayLayer.foldsIntersectingBufferRange([[0, 0], [Infinity, 0]]).length).toBe(1)
    })
  })

  describe('soft wraps', () => {
    it('soft wraps the line at the first word start at or preceding the softWrapColumn', () => {
      let buffer = new TextBuffer({
        text: 'abc def ghi jkl mno'
      })

      let displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('abc def \nghi jkl \nmno'))

      buffer = new TextBuffer({
        text: 'abc defg hij klmno'
      })

      displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('abc \ndefg \nhij \nklmno'))

      buffer = new TextBuffer({
        text: 'abcdefg hijklmno'
      })

      displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('abcdefg \nhijklmno'))
    })

    it('soft wraps the line at the softWrapColumn if no word start boundary precedes it', () => {
      let buffer = new TextBuffer({
        text: 'abcdefghijklmnopq'
      })

      let displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('abcdefgh\nijklmnop\nq'))

      buffer = new TextBuffer({
        text: 'abcd        efghijklmno'
      })

      displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('abcd    \n    \nefghijkl\nmno'))
    })

    it('does not soft wrap at the first word start boundary after leading whitespace', () => {
      let buffer = new TextBuffer({
        text: '    abcdefgh'
      })

      let displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('    abcd\n    efgh'))

      buffer = new TextBuffer({
        text: '            abcdefgh'
      })

      displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('        \n    abcd\n    efgh'))
    })

    it('soft wraps the line according to the isWrapBoundary function', () => {
      const buffer = new TextBuffer({
        text: 'abcdefghijk\nlmno'
      })

      const displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8,

        isWrapBoundary: function (previousCharacter, character) {
          return character === 'd'
        }
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('abc\ndefghijk\nlmno'))
    })

    it('takes into account character ratios when determining the wrap boundary', () => {
      const ratiosByCharacter = {
        'ㅅ': 1.3,
        'ㅘ': 1.3,
        'ｶ': 0.5,
        'ﾕ': 0.5,
        'あ': 2,
        '繁': 2,
        '體': 2,
        '字': 2,
        ' ': 4
      }

      const buffer = new TextBuffer({
        text: 'ㅅㅘｶﾕあ繁體字abc def\n 字ｶﾕghi'
      })

      const displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 7,
        ratioForCharacter: (c) => ratiosByCharacter[c] || 1
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('ㅅㅘｶﾕあ\n繁體字a\nbc \ndef\n 字ｶﾕ\n ghi'))
    })

    it('preserves the indent on wrapped segments of the line', () => {
      const buffer = new TextBuffer({
        text: '     abc de fgh ijk\n  lmnopqrst'
      })

      const displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 9,
        showIndentGuides: true,
        tabLength: 2,

        invisibles: {
          space: '•'
        }
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(
        JSON.stringify('•••••abc \n     de \n     fgh \n     ijk\n••lmnopqr\n  st')
      )

      expectTokenBoundaries(displayLayer, [
        {
          close: [],
          open: ['invisible-character leading-whitespace indent-guide'],
          text: '••'
        },
        {
          close: ['invisible-character leading-whitespace indent-guide'],
          open: ['invisible-character leading-whitespace indent-guide'],
          text: '••'
        },
        {
          close: ['invisible-character leading-whitespace indent-guide'],
          open: ['invisible-character leading-whitespace indent-guide'],
          text: '•'
        },
        {
          close: ['invisible-character leading-whitespace indent-guide'],
          open: [],
          text: 'abc '
        },
        {
          close: [],
          open: [],
          text: ''
        },
        {
          close: [],
          open: ['indent-guide'],
          text: '  '
        },
        {
          close: ['indent-guide'],
          open: ['indent-guide'],
          text: '  '
        },
        {
          close: ['indent-guide'],
          open: ['indent-guide'],
          text: ' '
        },
        {
          close: ['indent-guide'],
          open: [],
          text: 'de '
        },
        {
          close: [],
          open: [],
          text: ''
        },
        {
          close: [],
          open: ['indent-guide'],
          text: '  '
        },
        {
          close: ['indent-guide'],
          open: ['indent-guide'],
          text: '  '
        },
        {
          close: ['indent-guide'],
          open: ['indent-guide'],
          text: ' '
        },
        {
          close: ['indent-guide'],
          open: [],
          text: 'fgh '
        },
        {
          close: [],
          open: [],
          text: ''
        },
        {
          close: [],
          open: ['indent-guide'],
          text: '  '
        },
        {
          close: ['indent-guide'],
          open: ['indent-guide'],
          text: '  '
        },
        {
          close: ['indent-guide'],
          open: ['indent-guide'],
          text: ' '
        },
        {
          close: ['indent-guide'],
          open: [],
          text: 'ijk'
        },
        {
          close: [],
          open: ['invisible-character leading-whitespace indent-guide'],
          text: '••'
        },
        {
          close: ['invisible-character leading-whitespace indent-guide'],
          open: [],
          text: 'lmnopqr'
        },
        {
          close: [],
          open: [],
          text: ''
        },
        {
          close: [],
          open: ['indent-guide'],
          text: '  '
        },
        {
          close: ['indent-guide'],
          open: [],
          text: 'st'
        }
      ])
    })

    it('ignores indents that are greater than or equal to the softWrapColumn', () => {
      const buffer = new TextBuffer({
        text: '        abcde fghijk'
      })

      const displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('        \nabcde \nfghijk'))
    })

    it('honors the softWrapHangingIndent setting', () => {
      let buffer = new TextBuffer({
        text: 'abcdef ghi'
      })

      let displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8,
        softWrapHangingIndent: 2
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('abcdef \n  ghi'))

      buffer = new TextBuffer({
        text: '   abc de fgh ijk'
      })

      displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8,
        softWrapHangingIndent: 2
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('   abc \n     de \n     fgh\n      \n     ijk'))

      buffer = new TextBuffer({
        text: '        abcde fghijk'
      })

      displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8,
        softWrapHangingIndent: 2
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('        \n  abcde \n  fghijk'))
    })

    it('correctly soft wraps lines with trailing hard tabs', () => {
      const buffer = new TextBuffer({
        text: 'abc def\t\t'
      })

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 4,
        softWrapColumn: 8
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('abc \ndef     '))
    })

    it('correctly soft wraps lines when hard tabs are wider than the softWrapColumn', () => {
      const buffer = new TextBuffer({
        text: '\they'
      })

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 10,
        softWrapColumn: 8
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('          \nhey'))
    })

    it('translates points correctly on soft-wrapped lines', () => {
      const buffer = new TextBuffer({
        text: '   abc defgh'
      })

      const displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8,
        softWrapHangingIndent: 2
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('   abc \n     def\n     gh'))

      expectPositionTranslations(displayLayer, [
        [Point(0, 0), Point(0, 0)],
        [Point(0, 1), Point(0, 1)],
        [Point(0, 2), Point(0, 2)],
        [Point(0, 3), Point(0, 3)],
        [Point(0, 4), Point(0, 4)],
        [Point(0, 5), Point(0, 5)],
        [Point(0, 6), Point(0, 6)],
        [Point(0, 7), [Point(0, 6), Point(0, 7)]],
        [Point(0, 8), [Point(0, 6), Point(0, 7)]],
        [Point(1, 0), [Point(0, 6), Point(0, 7)]],
        [Point(1, 1), [Point(0, 6), Point(0, 7)]],
        [Point(1, 2), [Point(0, 6), Point(0, 7)]],
        [Point(1, 3), [Point(0, 6), Point(0, 7)]],
        [Point(1, 4), [Point(0, 6), Point(0, 7)]],
        [Point(1, 5), Point(0, 7)],
        [Point(1, 6), Point(0, 8)],
        [Point(1, 7), Point(0, 9)],
        [Point(1, 8), [Point(0, 9), Point(0, 10)]],
        [Point(1, 9), [Point(0, 9), Point(0, 10)]],
        [Point(2, 0), [Point(0, 9), Point(0, 10)]],
        [Point(2, 1), [Point(0, 9), Point(0, 10)]],
        [Point(2, 2), [Point(0, 9), Point(0, 10)]],
        [Point(2, 3), [Point(0, 9), Point(0, 10)]],
        [Point(2, 4), [Point(0, 9), Point(0, 10)]],
        [Point(2, 5), Point(0, 10)],
        [Point(2, 6), Point(0, 11)],
        [Point(2, 7), Point(0, 12)]
      ])
    })

    it('allows to query the soft-wrap descriptor of each screen row', () => {
      const buffer = new TextBuffer({
        text: 'abc def ghi\njkl mno pqr'
      })

      const displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 4
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('abc \ndef \nghi\njkl \nmno \npqr'))

      expect(displayLayer.softWrapDescriptorForScreenRow(0)).toEqual({
        softWrappedAtStart: false,
        softWrappedAtEnd: true,
        bufferRow: 0
      })

      expect(displayLayer.softWrapDescriptorForScreenRow(1)).toEqual({
        softWrappedAtStart: true,
        softWrappedAtEnd: true,
        bufferRow: 0
      })

      expect(displayLayer.softWrapDescriptorForScreenRow(2)).toEqual({
        softWrappedAtStart: true,
        softWrappedAtEnd: false,
        bufferRow: 0
      })

      expect(displayLayer.softWrapDescriptorForScreenRow(3)).toEqual({
        softWrappedAtStart: false,
        softWrappedAtEnd: true,
        bufferRow: 1
      })

      expect(displayLayer.softWrapDescriptorForScreenRow(4)).toEqual({
        softWrappedAtStart: true,
        softWrappedAtEnd: true,
        bufferRow: 1
      })

      expect(displayLayer.softWrapDescriptorForScreenRow(5)).toEqual({
        softWrappedAtStart: true,
        softWrappedAtEnd: false,
        bufferRow: 1
      })
    })

    it('prefers the skipSoftWrapIndentation option over clipDirection when translating points', () => {
      const buffer = new TextBuffer({
        text: '   abc defgh'
      })

      const displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 8,
        softWrapHangingIndent: 2
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('   abc \n     def\n     gh'))

      expect(displayLayer.clipScreenPosition([1, 0], {
        clipDirection: 'backward',
        skipSoftWrapIndentation: true
      })).toEqual([1, 5])

      expect(displayLayer.translateScreenPosition([1, 0], {
        clipDirection: 'backward',
        skipSoftWrapIndentation: true
      })).toEqual([0, 7])
    })

    it('renders trailing whitespaces correctly, even when they are wrapped', () => {
      const buffer = new TextBuffer({
        text: '  abc                     '
      })

      const displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 10
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('  abc     \n          \n          '))

      expectTokenBoundaries(displayLayer, [{
        text: '  ',
        close: [],
        open: ['leading-whitespace']
      }, {
        text: 'abc',
        close: ['leading-whitespace'],
        open: []
      }, {
        text: '     ',
        close: [],
        open: ['trailing-whitespace']
      }, {
        text: '',
        close: ['trailing-whitespace'],
        open: []
      }, {
        text: '  ',
        close: [],
        open: []
      }, {
        text: '        ',
        close: [],
        open: ['trailing-whitespace']
      }, {
        text: '',
        close: ['trailing-whitespace'],
        open: []
      }, {
        text: '  ',
        close: [],
        open: []
      }, {
        text: '        ',
        close: [],
        open: ['trailing-whitespace']
      }, {
        text: '',
        close: ['trailing-whitespace'],
        open: []
      }])
    })

    it('gracefully handles non-positive softWrapColumns', () => {
      const buffer = new TextBuffer({
        text: 'abc'
      })

      let displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 0
      })

      expect(displayLayer.getText()).toBe('a\nb\nc')

      displayLayer = buffer.addDisplayLayer({
        softWrapColumn: -1
      })

      expect(displayLayer.getText()).toBe('a\nb\nc')
    })
  })

  describe('invisibles', () => {
    it('replaces leading whitespaces with the corresponding invisible character, appropriately decorated', () => {
      const buffer = new TextBuffer({
        text: 'az\n  b c\n   d\n \t e'
      })

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 4,

        invisibles: {
          space: '•'
        }
      })

      expect(displayLayer.getText()).toBe('az\n••b c\n•••d\n•   •e')

      expectTokenBoundaries(displayLayer, [{
        text: 'az',
        close: [],
        open: []
      }, {
        text: '••',
        close: [],
        open: ['invisible-character leading-whitespace']
      }, {
        text: 'b c',
        close: ['invisible-character leading-whitespace'],
        open: []
      }, {
        text: '•••',
        close: [],
        open: ['invisible-character leading-whitespace']
      }, {
        text: 'd',
        close: ['invisible-character leading-whitespace'],
        open: []
      }, {
        text: '•',
        close: [],
        open: ['invisible-character leading-whitespace']
      }, {
        text: '   ',
        close: ['invisible-character leading-whitespace'],
        open: ['hard-tab leading-whitespace']
      }, {
        text: '•',
        close: ['hard-tab leading-whitespace'],
        open: ['invisible-character leading-whitespace']
      }, {
        text: 'e',
        close: ['invisible-character leading-whitespace'],
        open: []
      }])
    })

    it('replaces trailing whitespaces with the corresponding invisible character, appropriately decorated', () => {
      const buffer = new TextBuffer('abcd\n       \nefgh   jkl\nmno  pqr   \nst  uvw  \t  ')

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 4,

        invisibles: {
          space: '•'
        }
      })

      expect(displayLayer.getText()).toEqual('abcd\n•••••••\nefgh   jkl\nmno  pqr•••\nst  uvw••   ••')

      expectTokenBoundaries(displayLayer, [{
        text: 'abcd',
        close: [],
        open: []
      }, {
        text: '••••',
        close: [],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '•••',
        close: ['invisible-character trailing-whitespace'],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '',
        close: ['invisible-character trailing-whitespace'],
        open: []
      }, {
        text: 'efgh   jkl',
        close: [],
        open: []
      }, {
        text: 'mno  pqr',
        close: [],
        open: []
      }, {
        text: '•••',
        close: [],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '',
        close: ['invisible-character trailing-whitespace'],
        open: []
      }, {
        text: 'st  uvw',
        close: [],
        open: []
      }, {
        text: '••',
        close: [],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '   ',
        close: ['invisible-character trailing-whitespace'],
        open: ['hard-tab trailing-whitespace']
      }, {
        text: '••',
        close: ['hard-tab trailing-whitespace'],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '',
        close: ['invisible-character trailing-whitespace'],
        open: []
      }])
    })

    it('decorates hard tabs, leading whitespace, and trailing whitespace, even when no invisible characters are specified', () => {
      const buffer = new TextBuffer(' \t a\tb \t \n  ')

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 4
      })

      expect(displayLayer.getText()).toEqual('     a  b    \n  ')

      expectTokenBoundaries(displayLayer, [{
        text: ' ',
        close: [],
        open: ['leading-whitespace']
      }, {
        text: '   ',
        close: ['leading-whitespace'],
        open: ['hard-tab leading-whitespace']
      }, {
        text: ' ',
        close: ['hard-tab leading-whitespace'],
        open: ['leading-whitespace']
      }, {
        text: 'a',
        close: ['leading-whitespace'],
        open: []
      }, {
        text: '  ',
        close: [],
        open: ['hard-tab']
      }, {
        text: 'b',
        close: ['hard-tab'],
        open: []
      }, {
        text: ' ',
        close: [],
        open: ['trailing-whitespace']
      }, {
        text: '  ',
        close: ['trailing-whitespace'],
        open: ['hard-tab trailing-whitespace']
      }, {
        text: ' ',
        close: ['hard-tab trailing-whitespace'],
        open: ['trailing-whitespace']
      }, {
        text: '',
        close: ['trailing-whitespace'],
        open: []
      }, {
        text: '  ',
        close: [],
        open: ['trailing-whitespace']
      }, {
        text: '',
        close: ['trailing-whitespace'],
        open: []
      }])
    })

    it('renders invisibles correctly when leading or trailing whitespace intersects folds', () => {
      const buffer = new TextBuffer('    a    \n    b\nc    \nd')

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 4,

        invisibles: {
          space: '•'
        }
      })

      displayLayer.foldBufferRange([[0, 2], [0, 7]])
      displayLayer.foldBufferRange([[1, 2], [2, 2]])
      displayLayer.foldBufferRange([[2, 4], [3, 0]])
      expect(displayLayer.getText()).toBe('••⋯••\n••⋯••⋯d')

      expectTokenBoundaries(displayLayer, [{
        text: '••',
        close: [],
        open: ['invisible-character leading-whitespace']
      }, {
        text: '⋯',
        close: ['invisible-character leading-whitespace'],
        open: ['fold-marker']
      }, {
        text: '••',
        close: ['fold-marker'],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '',
        close: ['invisible-character trailing-whitespace'],
        open: []
      }, {
        text: '••',
        close: [],
        open: ['invisible-character leading-whitespace']
      }, {
        text: '⋯',
        close: ['invisible-character leading-whitespace'],
        open: ['fold-marker']
      }, {
        text: '••',
        close: ['fold-marker'],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '⋯',
        close: ['invisible-character trailing-whitespace'],
        open: ['fold-marker']
      }, {
        text: 'd',
        close: ['fold-marker'],
        open: []
      }])
    })

    it('renders tab invisibles, appropriately decorated', () => {
      const buffer = new TextBuffer({
        text: 'a\tb\t\n \t d  \t  '
      })

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 4,

        invisibles: {
          tab: '»',
          space: '•'
        }
      })

      expect(displayLayer.getText()).toBe('a»  b»  \n•»  •d••»   ••')

      expectTokenBoundaries(displayLayer, [{
        text: 'a',
        close: [],
        open: []
      }, {
        text: '»  ',
        close: [],
        open: ['invisible-character hard-tab']
      }, {
        text: 'b',
        close: ['invisible-character hard-tab'],
        open: []
      }, {
        text: '»  ',
        close: [],
        open: ['invisible-character hard-tab trailing-whitespace']
      }, {
        text: '',
        close: ['invisible-character hard-tab trailing-whitespace'],
        open: []
      }, {
        text: '•',
        close: [],
        open: ['invisible-character leading-whitespace']
      }, {
        text: '»  ',
        close: ['invisible-character leading-whitespace'],
        open: ['invisible-character hard-tab leading-whitespace']
      }, {
        text: '•',
        close: ['invisible-character hard-tab leading-whitespace'],
        open: ['invisible-character leading-whitespace']
      }, {
        text: 'd',
        close: ['invisible-character leading-whitespace'],
        open: []
      }, {
        text: '••',
        close: [],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '»   ',
        close: ['invisible-character trailing-whitespace'],
        open: ['invisible-character hard-tab trailing-whitespace']
      }, {
        text: '••',
        close: ['invisible-character hard-tab trailing-whitespace'],
        open: ['invisible-character trailing-whitespace']
      }, {
        text: '',
        close: ['invisible-character trailing-whitespace'],
        open: []
      }])
    })

    it('renders end of line invisibles, appropriately decorated', () => {
      const buffer = new TextBuffer({
        text: 'a\nb\n\nd e f\r\ngh\rij\n\r\n'
      })

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 4,

        invisibles: {
          cr: '¤',
          eol: '¬'
        }
      })

      expect(displayLayer.getText()).toBe('a¬\nb¬\n¬\nd e f¤¬\ngh¤\nij¬\n¤¬\n')

      expectTokenBoundaries(displayLayer, [
        {
          text: 'a',
          close: [],
          open: []
        },
        {
          text: '¬',
          close: [],
          open: ['invisible-character eol']
        },
        {
          text: '',
          close: ['invisible-character eol'],
          open: []
        },
        {
          text: 'b',
          close: [],
          open: []
        },
        {
          text: '¬',
          close: [],
          open: ['invisible-character eol']
        },
        {
          text: '',
          close: ['invisible-character eol'],
          open: []
        },
        {
          text: '',
          close: [],
          open: []
        },
        {
          text: '¬',
          close: [],
          open: ['invisible-character eol']
        },
        {
          text: '',
          close: ['invisible-character eol'],
          open: []
        },
        {
          text: 'd e f',
          close: [],
          open: []
        },
        {
          text: '¤¬',
          close: [],
          open: ['invisible-character eol']
        },
        {
          text: '',
          close: ['invisible-character eol'],
          open: []
        },
        {
          text: 'gh',
          close: [],
          open: []
        },
        {
          text: '¤',
          close: [],
          open: ['invisible-character eol']
        },
        {
          text: '',
          close: ['invisible-character eol'],
          open: []
        },
        {
          text: 'ij',
          close: [],
          open: []
        },
        {
          text: '¬',
          close: [],
          open: ['invisible-character eol']
        },
        {
          text: '',
          close: ['invisible-character eol'],
          open: []
        },
        {
          text: '',
          close: [],
          open: []
        },
        {
          text: '¤¬',
          close: [],
          open: ['invisible-character eol']
        },
        {
          text: '',
          close: ['invisible-character eol'],
          open: []
        },
        {
          text: '',
          close: [],
          open: []
        }
      ])

      expect(displayLayer.translateScreenPosition([0, 1], {
        clipDirection: 'forward'
      })).toEqual([0, 1])

      expect(displayLayer.clipScreenPosition([0, 1], {
        clipDirection: 'forward'
      })).toEqual([0, 1])
    })

    it('does not clip positions within runs of invisible characters', () => {
      const buffer = new TextBuffer({
        text: '   a'
      })

      const displayLayer = buffer.addDisplayLayer({
        invisibles: {
          space: '•'
        }
      })

      expect(displayLayer.clipScreenPosition(Point(0, 2))).toEqual(Point(0, 2))
    })
  })

  describe('indent guides', () => {
    it('decorates tab-stop-aligned regions of leading whitespace with indent guides', () => {
      const buffer = new TextBuffer({
        text: '         a      \t  \n  \t\t b\n  \t\t'
      })

      const displayLayer = buffer.addDisplayLayer({
        showIndentGuides: true,
        tabLength: 4
      })

      expect(displayLayer.getText()).toBe('         a            \n         b\n        ')

      expectTokenBoundaries(displayLayer, [
        {
          text: '    ',
          close: [],
          open: ['leading-whitespace indent-guide']
        },
        {
          text: '    ',
          close: ['leading-whitespace indent-guide'],
          open: ['leading-whitespace indent-guide']
        },
        {
          text: ' ',
          close: ['leading-whitespace indent-guide'],
          open: ['leading-whitespace indent-guide']
        },
        {
          text: 'a',
          close: ['leading-whitespace indent-guide'],
          open: []
        },
        {
          text: '      ',
          close: [],
          open: ['trailing-whitespace']
        },
        {
          text: '    ',
          close: ['trailing-whitespace'],
          open: ['hard-tab trailing-whitespace']
        },
        {
          text: '  ',
          close: ['hard-tab trailing-whitespace'],
          open: ['trailing-whitespace']
        },
        {
          text: '',
          close: ['trailing-whitespace'],
          open: []
        },
        {
          text: '  ',
          close: [],
          open: ['leading-whitespace indent-guide']
        },
        {
          text: '  ',
          close: ['leading-whitespace indent-guide'],
          open: ['hard-tab leading-whitespace']
        },
        {
          text: '    ',
          close: ['hard-tab leading-whitespace'],
          open: ['hard-tab leading-whitespace indent-guide']
        },
        {
          text: ' ',
          close: ['hard-tab leading-whitespace indent-guide'],
          open: ['leading-whitespace indent-guide']
        },
        {
          text: 'b',
          close: ['leading-whitespace indent-guide'],
          open: []
        },
        {
          text: '  ',
          close: [],
          open: ['trailing-whitespace indent-guide']
        },
        {
          text: '  ',
          close: ['trailing-whitespace indent-guide'],
          open: ['hard-tab trailing-whitespace']
        },
        {
          text: '    ',
          close: ['hard-tab trailing-whitespace'],
          open: ['hard-tab trailing-whitespace indent-guide']
        },
        {
          text: '',
          close: ['hard-tab trailing-whitespace indent-guide'],
          open: []
        }
      ])
    })

    it('decorates empty lines with the max number of indent guides found on the surrounding non-empty lines', () => {
      const buffer = new TextBuffer({
        text: '\n\n          a\n\n\t \t b\n\n\n'
      })

      const displayLayer = buffer.addDisplayLayer({
        showIndentGuides: true,
        tabLength: 4,

        invisibles: {
          eol: '¬'
        }
      })

      expect(displayLayer.getText()).toBe(
        '¬         \n¬         \n          a¬\n¬         \n         b¬\n¬        \n¬        \n         '
      )

      expectTokenBoundaries(displayLayer, [
        {text: '', close: [], open: []},
        {text: '¬', close: [], open: ['invisible-character eol indent-guide']},
        {text: '   ', close: ['invisible-character eol indent-guide'], open: []},
        {text: '    ', close: [], open: ['indent-guide']},
        {text: '  ', close: ['indent-guide'], open: ['indent-guide']},
        {text: '', close: ['indent-guide'], open: []},
        {text: '', close: [], open: []},
        {text: '¬', close: [], open: ['invisible-character eol indent-guide']},
        {text: '   ', close: ['invisible-character eol indent-guide'], open: []},
        {text: '    ', close: [], open: ['indent-guide']},
        {text: '  ', close: ['indent-guide'], open: ['indent-guide']},
        {text: '', close: ['indent-guide'], open: []},
        {text: '    ', close: [], open: ['leading-whitespace indent-guide']},
        {text: '    ', close: ['leading-whitespace indent-guide'], open: ['leading-whitespace indent-guide']},
        {text: '  ', close: ['leading-whitespace indent-guide'], open: ['leading-whitespace indent-guide']},
        {text: 'a', close: ['leading-whitespace indent-guide'], open: []},
        {text: '¬', close: [], open: ['invisible-character eol']},
        {text: '', close: ['invisible-character eol'], open: []},
        {text: '', close: [], open: []},
        {text: '¬', close: [], open: ['invisible-character eol indent-guide']},
        {text: '   ', close: ['invisible-character eol indent-guide'], open: []},
        {text: '    ', close: [], open: ['indent-guide']},
        {text: '  ', close: ['indent-guide'], open: ['indent-guide']},
        {text: '', close: ['indent-guide'], open: []},
        {text: '    ', close: [], open: ['hard-tab leading-whitespace indent-guide']},
        {text: ' ', close: ['hard-tab leading-whitespace indent-guide'], open: ['leading-whitespace indent-guide']},
        {text: '   ', close: ['leading-whitespace indent-guide'], open: ['hard-tab leading-whitespace']},
        {text: ' ', close: ['hard-tab leading-whitespace'], open: ['leading-whitespace indent-guide']},
        {text: 'b', close: ['leading-whitespace indent-guide'], open: []},
        {text: '¬', close: [], open: ['invisible-character eol']},
        {text: '', close: ['invisible-character eol'], open: []},
        {text: '', close: [], open: []},
        {text: '¬', close: [], open: ['invisible-character eol indent-guide']},
        {text: '   ', close: ['invisible-character eol indent-guide'], open: []},
        {text: '    ', close: [], open: ['indent-guide']},
        {text: ' ', close: ['indent-guide'], open: ['indent-guide']},
        {text: '', close: ['indent-guide'], open: []},
        {text: '', close: [], open: []},
        {text: '¬', close: [], open: ['invisible-character eol indent-guide']},
        {text: '   ', close: ['invisible-character eol indent-guide'], open: []},
        {text: '    ', close: [], open: ['indent-guide']},
        {text: ' ', close: ['indent-guide'], open: ['indent-guide']},
        {text: '', close: ['indent-guide'], open: []},
        {text: '', close: [], open: []},
        {text: '    ', close: [], open: ['indent-guide']},
        {text: '    ', close: ['indent-guide'], open: ['indent-guide']},
        {text: ' ', close: ['indent-guide'], open: ['indent-guide']},
        {text: '', close: ['indent-guide'], open: []}
      ])

      expect(displayLayer.clipScreenPosition([0, 0], {
        clipDirection: 'backward'
      })).toEqual([0, 0])

      expect(displayLayer.clipScreenPosition([0, 0], {
        clipDirection: 'forward'
      })).toEqual([0, 0])

      expect(displayLayer.clipScreenPosition([0, 1], {
        clipDirection: 'backward'
      })).toEqual([0, 0])

      expect(displayLayer.clipScreenPosition([0, 1], {
        clipDirection: 'forward'
      })).toEqual([1, 0])

      expect(displayLayer.clipScreenPosition([0, 2], {
        clipDirection: 'backward'
      })).toEqual([0, 0])

      expect(displayLayer.clipScreenPosition([0, 2], {
        clipDirection: 'forward'
      })).toEqual([1, 0])

      expect(displayLayer.clipScreenPosition([0, 4], {
        clipDirection: 'backward'
      })).toEqual([0, 0])

      expect(displayLayer.clipScreenPosition([0, 4], {
        clipDirection: 'forward'
      })).toEqual([1, 0])

      expect(displayLayer.clipScreenPosition([0, 6], {
        clipDirection: 'backward'
      })).toEqual([0, 0])

      expect(displayLayer.clipScreenPosition([0, 6], {
        clipDirection: 'forward'
      })).toEqual([1, 0])

      expect(displayLayer.clipScreenPosition([0, 8], {
        clipDirection: 'backward'
      })).toEqual([0, 0])

      expect(displayLayer.clipScreenPosition([0, 8], {
        clipDirection: 'forward'
      })).toEqual([1, 0])

      expect(displayLayer.clipScreenPosition([0, 9], {
        clipDirection: 'backward'
      })).toEqual([0, 0])

      expect(displayLayer.clipScreenPosition([0, 9], {
        clipDirection: 'forward'
      })).toEqual([1, 0])

      expect(displayLayer.clipScreenPosition([7, 3], {
        clipDirection: 'backward'
      })).toEqual([7, 0])

      expect(displayLayer.clipScreenPosition([7, 3], {
        clipDirection: 'forward'
      })).toEqual([7, 0])
    })

    it('renders a single indent guide on empty lines surrounded by lines with leading whitespace less than the tab length', () => {
      const buffer = new TextBuffer({
        text: 'a\n\nb\n  c\n\n'
      })

      const displayLayer = buffer.addDisplayLayer({
        showIndentGuides: true,
        tabLength: 4
      })

      expect(JSON.stringify(displayLayer.getText())).toBe(JSON.stringify('a\n\nb\n  c\n  \n  '))

      expectTokenBoundaries(displayLayer, [
        {text: 'a', close: [], open: []},
        {text: '', close: [], open: []},
        {text: 'b', close: [], open: []},
        {text: '  ', close: [], open: ['leading-whitespace indent-guide']},
        {text: 'c', close: ['leading-whitespace indent-guide'], open: []},
        {text: '', close: [], open: []},
        {text: '  ', close: [], open: ['indent-guide']},
        {text: '', close: ['indent-guide'], open: []},
        {text: '', close: [], open: []},
        {text: '  ', close: [], open: ['indent-guide']},
        {text: '', close: ['indent-guide'], open: []}
      ])
    })
  })

  describe('text decorations', () => {
    it('exposes open and close tags from the text decoration layer in the token iterator', () => {
      const buffer = new TextBuffer({
        text: 'abcde\nfghij\nklmno'
      })

      const displayLayer = buffer.addDisplayLayer()

      displayLayer.setTextDecorationLayer(new TestDecorationLayer([
        ['aa', [[0, 1], [0, 4]]],
        ['ab', [[0, 2], [1, 2]]],
        ['ac', [[0, 3], [1, 2]]],
        ['ad', [[1, 3], [2, 0]]],
        ['ae', [[2, 3], [2, 5]]]
      ]))

      expectTokenBoundaries(displayLayer, [
        {text: 'a', close: [], open: []},
        {text: 'b', close: [], open: ['aa']},
        {text: 'c', close: [], open: ['ab']},
        {text: 'd', close: [], open: ['ac']},
        {text: 'e', close: ['ac', 'ab', 'aa'], open: ['ab', 'ac']},
        {text: '', close: ['ac', 'ab'], open: []},
        {text: 'fg', close: [], open: ['ab', 'ac']},
        {text: 'h', close: ['ac', 'ab'], open: []},
        {text: 'ij', close: [], open: ['ad']},
        {text: '', close: ['ad'], open: []},
        {text: 'klm', close: [], open: []},
        {text: 'no', close: [], open: ['ae']},
        {text: '', close: ['ae'], open: []}
      ])
    })

    it('truncates decoration tags at fold boundaries', () => {
      const buffer = new TextBuffer({
        text: 'abcde\nfghij\nklmno'
      })

      const displayLayer = buffer.addDisplayLayer()
      displayLayer.foldBufferRange([[0, 3], [2, 2]])

      displayLayer.setTextDecorationLayer(new TestDecorationLayer([
        ['preceding-fold', [[0, 1], [0, 2]]],
        ['ending-at-fold-start', [[0, 1], [0, 3]]],
        ['overlapping-fold-start', [[0, 1], [1, 1]]],
        ['inside-fold', [[0, 4], [1, 4]]],
        ['overlapping-fold-end', [[1, 4], [2, 4]]],
        ['starting-at-fold-end', [[2, 2], [2, 4]]],
        ['following-fold', [[2, 4], [2, 5]]],
        ['surrounding-fold', [[0, 1], [2, 5]]]
      ]))

      expectTokenBoundaries(displayLayer, [
        {
          text: 'a',
          close: [],
          open: []
        },
        {
          text: 'b',
          close: [],
          open: ['preceding-fold', 'ending-at-fold-start', 'overlapping-fold-start', 'surrounding-fold']
        },
        {
          text: 'c',
          close: ['surrounding-fold', 'overlapping-fold-start', 'ending-at-fold-start', 'preceding-fold'],
          open: ['ending-at-fold-start', 'overlapping-fold-start', 'surrounding-fold']
        },
        {
          text: '⋯',
          close: ['surrounding-fold', 'overlapping-fold-start', 'ending-at-fold-start'],
          open: ['fold-marker']
        },
        {
          text: 'mn',
          close: ['fold-marker'],
          open: ['surrounding-fold', 'overlapping-fold-end', 'starting-at-fold-end']
        },
        {
          text: 'o',
          close: ['starting-at-fold-end', 'overlapping-fold-end'],
          open: ['following-fold']
        },
        {
          text: '',
          close: ['following-fold', 'surrounding-fold'],
          open: []
        }
      ])
    })

    it('skips close tags with no matching open tag', () => {
      const buffer = new TextBuffer({
        text: 'abcde'
      })

      const displayLayer = buffer.addDisplayLayer()

      const boundaries = [{
        position: Point(0, 0),
        closeTags: [],
        openTags: ['a', 'b']
      }, {
        position: Point(0, 2),
        closeTags: ['c'],
        openTags: []
      }]

      const iterator = {
        getOpenTags () {
          return boundaries[0].openTags
        },

        getCloseTags () {
          return boundaries[0].closeTags
        },

        getPosition () {
          return (boundaries[0] && boundaries[0].position) || Point.INFINITY
        },

        moveToSuccessor () {
          return boundaries.shift()
        },

        seek () {
          return []
        }
      }

      displayLayer.setTextDecorationLayer({
        buildIterator () {
          return iterator
        }
      })

      expect(displayLayer.getScreenLines(0, 1)[0].tagCodes).toEqual([-1, -3, 2, -4, -2, -1, -3, 3, -4, -2])
    })

    it('emits update events from the display layer when text decoration ranges are invalidated', () => {
      const buffer = new TextBuffer({
        text: 'abc\ndef\nghi\njkl\nmno'
      })

      const displayLayer = buffer.addDisplayLayer()
      displayLayer.foldBufferRange([[1, 3], [2, 0]])
      const decorationLayer = new TestDecorationLayer([])
      displayLayer.setTextDecorationLayer(decorationLayer)
      const allChanges = []

      displayLayer.onDidChangeSync((changes) => allChanges.push(...changes))

      decorationLayer.emitInvalidateRangeEvent([[2, 1], [3, 2]])

      expect(allChanges).toEqual([{
        start: Point(1, 5),
        oldExtent: Point(1, 2),
        newExtent: Point(1, 2)
      }])
    })

    it('throws an error if the text decoration iterator reports a boundary beyond the end of a line', () => {
      const buffer = new TextBuffer({
        text: 'abc\n\tdef'
      })

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 2
      })

      const decorationLayer = new TestDecorationLayer([['a', [[0, 1], [0, 10]]]])
      displayLayer.setTextDecorationLayer(decorationLayer)
      let exception

      try {
        getTokenBoundaries(displayLayer)
      } catch (e) {
        exception = e
      }

      expect(exception.message).toMatch(/iterator/)
    })
  })

  describe('position translation', () => {
    it('honors the clip direction when in the middle of an atomic unit', () => {
      const buffer = new TextBuffer({
        text: '    hello world\nhow is it going\ni am good'
      })

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 4
      })

      displayLayer.foldBufferRange([[0, 7], [2, 7]])
      expect(displayLayer.getText()).toBe('    hel⋯od')

      expect(displayLayer.clipScreenPosition([0, 1], {
        clipDirection: 'backward'
      })).toEqual([0, 0])

      expect(displayLayer.clipScreenPosition([0, 1], {
        clipDirection: 'closest'
      })).toEqual([0, 0])

      expect(displayLayer.clipScreenPosition([0, 1], {
        clipDirection: 'forward'
      })).toEqual([0, 4])

      expect(displayLayer.clipScreenPosition([0, 2], {
        clipDirection: 'backward'
      })).toEqual([0, 0])

      expect(displayLayer.clipScreenPosition([0, 2], {
        clipDirection: 'closest'
      })).toEqual([0, 0])

      expect(displayLayer.clipScreenPosition([0, 2], {
        clipDirection: 'forward'
      })).toEqual([0, 4])

      expect(displayLayer.clipScreenPosition([0, 3], {
        clipDirection: 'backward'
      })).toEqual([0, 0])

      expect(displayLayer.clipScreenPosition([0, 3], {
        clipDirection: 'closest'
      })).toEqual([0, 4])

      expect(displayLayer.clipScreenPosition([0, 3], {
        clipDirection: 'forward'
      })).toEqual([0, 4])

      expect(displayLayer.translateScreenPosition([0, 1], {
        clipDirection: 'backward'
      })).toEqual([0, 0])

      expect(displayLayer.translateScreenPosition([0, 1], {
        clipDirection: 'closest'
      })).toEqual([0, 0])

      expect(displayLayer.translateScreenPosition([0, 1], {
        clipDirection: 'forward'
      })).toEqual([0, 4])

      expect(displayLayer.translateScreenPosition([0, 2], {
        clipDirection: 'backward'
      })).toEqual([0, 0])

      expect(displayLayer.translateScreenPosition([0, 2], {
        clipDirection: 'closest'
      })).toEqual([0, 0])

      expect(displayLayer.translateScreenPosition([0, 2], {
        clipDirection: 'forward'
      })).toEqual([0, 4])

      expect(displayLayer.translateScreenPosition([0, 3], {
        clipDirection: 'backward'
      })).toEqual([0, 0])

      expect(displayLayer.translateScreenPosition([0, 3], {
        clipDirection: 'closest'
      })).toEqual([0, 4])

      expect(displayLayer.translateScreenPosition([0, 3], {
        clipDirection: 'forward'
      })).toEqual([0, 4])

      expect(displayLayer.translateBufferPosition([0, 12], {
        clipDirection: 'backward'
      })).toEqual([0, 7])

      expect(displayLayer.translateBufferPosition([0, 12], {
        clipDirection: 'closest'
      })).toEqual([0, 7])

      expect(displayLayer.translateBufferPosition([0, 12], {
        clipDirection: 'forward'
      })).toEqual([0, 8])

      expect(displayLayer.translateBufferPosition([1, 7], {
        clipDirection: 'backward'
      })).toEqual([0, 7])

      expect(displayLayer.translateBufferPosition([1, 7], {
        clipDirection: 'closest'
      })).toEqual([0, 7])

      expect(displayLayer.translateBufferPosition([1, 7], {
        clipDirection: 'forward'
      })).toEqual([0, 8])

      expect(displayLayer.translateBufferPosition([1, 8], {
        clipDirection: 'backward'
      })).toEqual([0, 7])

      expect(displayLayer.translateBufferPosition([1, 8], {
        clipDirection: 'closest'
      })).toEqual([0, 8])

      expect(displayLayer.translateBufferPosition([1, 8], {
        clipDirection: 'forward'
      })).toEqual([0, 8])
    })
  })

  describe('.getApproximateScreenLineCount()', () => {
    it('estimates the screen line count based on the currently-indexed portion of the buffer', () => {
      const buffer = new TextBuffer({
        text: '111 111\n222 222\n3\n4\n5\n6\n7\n8'
      })

      const displayLayer = buffer.addDisplayLayer({
        softWrapColumn: 4
      })

      expect(buffer.getLineCount()).toBe(8)
      expect(displayLayer.getApproximateScreenLineCount()).toEqual(8)

      expect(displayLayer.translateBufferPosition(Point(0, Infinity))).toEqual(Point(1, 3))
      expect(displayLayer.indexedBufferRowCount).toBe(2)
      expect(displayLayer.getApproximateScreenLineCount()).toEqual(16)

      expect(displayLayer.translateBufferPosition(Point(2, 1))).toEqual(Point(4, 1))
      expect(displayLayer.indexedBufferRowCount).toBe(4)
      expect(displayLayer.getApproximateScreenLineCount()).toEqual(12)

      expect(displayLayer.translateBufferPosition(Point(3, 1))).toEqual(Point(5, 1))
      expect(displayLayer.indexedBufferRowCount).toBe(5)
      expect(displayLayer.getApproximateScreenLineCount()).toEqual(12)

      expect(displayLayer.translateBufferPosition(Point(4, 1))).toEqual(Point(6, 1))
      expect(displayLayer.indexedBufferRowCount).toBe(6)
      expect(displayLayer.getApproximateScreenLineCount()).toEqual(11)

      expect(displayLayer.getScreenLineCount()).toBe(10)
      expect(displayLayer.getApproximateScreenLineCount()).toBe(10)
    })
  })

  describe('.getApproximateRightmostScreenPosition()', () => {
    it('returns the rightmost screen position that has been indexed so far', () => {
      const buffer = new TextBuffer({
        text: '111\n222 222\n333 333 333\n444 444'
      })

      const displayLayer = buffer.addDisplayLayer({})
      expect(displayLayer.getApproximateRightmostScreenPosition()).toEqual(Point.ZERO)
      displayLayer.translateBufferPosition(Point(0, 0))
      expect(displayLayer.indexedBufferRowCount).toBe(2)
      expect(displayLayer.getApproximateRightmostScreenPosition()).toEqual(Point(1, 7))
      displayLayer.translateBufferPosition(Point(1, 0))
      expect(displayLayer.indexedBufferRowCount).toBe(3)
      expect(displayLayer.getApproximateRightmostScreenPosition()).toEqual(Point(2, 11))
      displayLayer.translateBufferPosition(Point(2, 0))
      expect(displayLayer.indexedBufferRowCount).toBe(4)
      expect(displayLayer.getApproximateRightmostScreenPosition()).toEqual(Point(2, 11))
    })
  })

  describe('.doBackgroundWork(deadline)', () => {
    const fakeDeadline = function (timeRemaining) {
      return {
        timeRemaining: () => {
          return timeRemaining--
        }
      }
    }

    it('computes additional screen lines, returning true or false', () => {
      const buffer = new TextBuffer({
        text: 'yo\n'.repeat(100)
      })

      const displayLayer = buffer.addDisplayLayer({})
      expect(displayLayer.doBackgroundWork(fakeDeadline(11))).toBe(true)
      expect(displayLayer.indexedBufferRowCount).toBeGreaterThan(0)
      expect(displayLayer.indexedBufferRowCount).toBeLessThan(buffer.getLineCount())
      expect(displayLayer.doBackgroundWork(fakeDeadline(1000))).toBe(false)
      expect(displayLayer.indexedBufferRowCount).toBe(buffer.getLineCount())
    })
  })

  describe('.getScreenLines(startRow, endRow)', () => {
    it('returns an empty array when the given start row is greater than the screen line count', () => {
      const buffer = new TextBuffer({
        text: 'hello'
      })

      const displayLayer = buffer.addDisplayLayer({})
      expect(displayLayer.getScreenLines(1, 2)).toEqual([])
    })
  })

  const now = Date.now()

  for (let i = 0; i < 100; i++) {
    const seed = now + i

    it('updates the displayed text correctly when the underlying buffer changes: ' + seed, () => {
      const random = new Random(seed)

      const buffer = new TextBuffer({
        text: buildRandomLines(random, 20)
      })

      const invisibles = {}

      if (random(2) > 0) {
        invisibles.space = '•'
      }

      if (random(2) > 0) {
        invisibles.eol = '¬'
      }

      if (random(2) > 0) {
        invisibles.cr = '¤'
      }

      const softWrapColumn = random(2) ? random.intBetween(5, 80) : null
      const showIndentGuides = Boolean(random(2))

      const displayLayer = buffer.addDisplayLayer({
        tabLength: 4,
        invisibles: invisibles,
        showIndentGuides: showIndentGuides,
        softWrapColumn: softWrapColumn
      })

      const textDecorationLayer = new TestDecorationLayer([], buffer, random)
      displayLayer.setTextDecorationLayer(textDecorationLayer)
      displayLayer.getText(0, 3)
      const foldIds = []
      let undoableChanges = 0
      let redoableChanges = 0
      const screenLinesById = new Map()

      for (let j = 0; j < 10; j++) {
        const k = random(10)

        if (k < 2) {
          createRandomFold(random, displayLayer, foldIds)
        } else if (k < 3 && !hasComputedAllScreenRows(displayLayer)) {
          performReadOutsideOfIndexedRegion(random, displayLayer)
        } else if (k < 4 && foldIds.length > 0) {
          destroyRandomFold(random, displayLayer, foldIds)
        } else if (k < 5 && undoableChanges > 0) {
          undoableChanges--
          redoableChanges++
          performUndo(random, displayLayer)
        } else if (k < 6 && redoableChanges > 0) {
          undoableChanges++
          redoableChanges--
          performRedo(random, displayLayer)
        } else {
          undoableChanges++
          performRandomChange(random, displayLayer)
        }

        const freshDisplayLayer = displayLayer.copy()
        freshDisplayLayer.setTextDecorationLayer(displayLayer.getTextDecorationLayer())
        freshDisplayLayer.getScreenLines()
        verifyTokenConsistency(displayLayer)
        verifyText(displayLayer, freshDisplayLayer)
        verifyPositionTranslations(displayLayer)
        verifyRightmostScreenPosition(freshDisplayLayer)
        verifyScreenLineIds(displayLayer, screenLinesById)
      }
    })
  }
})

function performRandomChange (random, displayLayer) {
  const text = buildRandomLines(random, 4)
  const range = getRandomBufferRange(random, displayLayer)
  log(('buffer change ' + (range) + ' ' + (JSON.stringify(text))))

  verifyChangeEvent(displayLayer, () => {
    displayLayer.buffer.setTextInRange(range, text)
  })
}

function performUndo (random, displayLayer) {
  log('undo')

  verifyChangeEvent(displayLayer, () => {
    displayLayer.buffer.undo()
  })
}

function performRedo (random, displayLayer) {
  log('redo')

  verifyChangeEvent(displayLayer, () => {
    displayLayer.buffer.redo()
  })
}

function createRandomFold (random, displayLayer, foldIds) {
  const bufferRange = getRandomBufferRange(random, displayLayer)
  log('fold ' + bufferRange)

  verifyChangeEvent(displayLayer, () => {
    foldIds.push(displayLayer.foldBufferRange(bufferRange))
  })
}

function destroyRandomFold (random, displayLayer, foldIds) {
  const foldIndex = random(foldIds.length - 1)
  log('destroy fold ' + foldIndex)

  verifyChangeEvent(displayLayer, () => {
    displayLayer.destroyFold(foldIds.splice(foldIndex, 1)[0])
  })
}

function performReadOutsideOfIndexedRegion (random, displayLayer) {
  const computedRowCount = getComputedScreenLineCount(displayLayer)
  const row = random.intBetween(computedRowCount, computedRowCount + 10)
  log('new-read ' + row)
  return displayLayer.getScreenLines(0, row)
}

function log (message) {}

function verifyChangeEvent (displayLayer, fn) {
  let displayLayerCopy = displayLayer.copy()
  displayLayerCopy.setTextDecorationLayer(displayLayer.getTextDecorationLayer())
  const previousTokenLines = getTokens(displayLayerCopy)
  displayLayerCopy.destroy()
  let lastChanges = null

  const disposable = displayLayer.onDidChangeSync(function (changes) {
    lastChanges = changes
  })

  fn()
  disposable.dispose()
  displayLayerCopy = displayLayer.copy()
  displayLayerCopy.setTextDecorationLayer(displayLayer.getTextDecorationLayer())
  const expectedTokenLines = getTokens(displayLayerCopy)
  updateTokenLines(previousTokenLines, displayLayerCopy, lastChanges)
  displayLayerCopy.destroy()
  expect(previousTokenLines).toEqual(expectedTokenLines)
}

function verifyText (displayLayer, freshDisplayLayer) {
  const rowCount = getComputedScreenLineCount(displayLayer)
  const text = displayLayer.getText(0, rowCount)
  const expectedText = freshDisplayLayer.getText(0, rowCount)
  expect(JSON.stringify(text)).toBe(JSON.stringify(expectedText))
}

function verifyTokenConsistency (displayLayer) {
  const containingTags = []

  for (const tokens of getTokenBoundaries(displayLayer, 0, getComputedScreenLineCount(displayLayer))) {
    for (const {closeTags, openTags} of tokens) {
      for (const tag of closeTags) {
        const mostRecentOpenTag = containingTags.pop()
        expect(mostRecentOpenTag).toBe(tag)
      }

      containingTags.push(...openTags)
    }

    expect(containingTags).toEqual([])
  }

  expect(containingTags).toEqual([])
}

function verifyPositionTranslations (displayLayer) {
  let lineScreenStart = Point.ZERO
  let lineBufferStart = Point.ZERO
  const rowCount = getComputedScreenLineCount(displayLayer)

  for (const screenLine of displayLayer.buildSpatialScreenLines(0, Infinity, rowCount).spatialScreenLines) {
    let tokenScreenStart = lineScreenStart
    let tokenBufferStart = lineBufferStart

    for (const token of screenLine.tokens) {
      let tokenScreenEnd = traverse(tokenScreenStart, Point(0, token.screenExtent))
      let tokenBufferEnd = traverse(tokenBufferStart, token.bufferExtent)

      for (let i = 0; i < token.screenExtent; i++) {
        const screenPosition = traverse(tokenScreenStart, Point(0, i))
        const bufferPosition = traverse(tokenBufferStart, Point(0, i))

        if (token.metadata & displayLayer.ATOMIC_TOKEN) {
          if (!isEqualPoint(screenPosition, tokenScreenStart)) {
            expect(displayLayer.clipScreenPosition(screenPosition, {
              clipDirection: 'backward'
            })).toEqual(tokenScreenStart)

            expect(displayLayer.clipScreenPosition(screenPosition, {
              clipDirection: 'forward'
            })).toEqual(tokenScreenEnd)

            expect(displayLayer.translateScreenPosition(screenPosition, {
              clipDirection: 'backward'
            })).toEqual(tokenBufferStart)

            expect(displayLayer.translateScreenPosition(screenPosition, {
              clipDirection: 'forward'
            })).toEqual(tokenBufferEnd)

            if (comparePoints(bufferPosition, tokenBufferEnd) < 0) {
              expect(displayLayer.translateBufferPosition(bufferPosition, {
                clipDirection: 'backward'
              })).toEqual(tokenScreenStart)

              expect(displayLayer.translateBufferPosition(bufferPosition, {
                clipDirection: 'forward'
              })).toEqual(tokenScreenEnd)
            }
          }
        } else if (!(token.metadata & displayLayer.VOID_TOKEN)) {
          expect(displayLayer.clipScreenPosition(screenPosition, {
            clipDirection: 'backward'
          })).toEqual(screenPosition)

          expect(displayLayer.clipScreenPosition(screenPosition, {
            clipDirection: 'forward'
          })).toEqual(screenPosition)

          expect(displayLayer.translateScreenPosition(screenPosition, {
            clipDirection: 'backward'
          })).toEqual(bufferPosition)

          expect(displayLayer.translateScreenPosition(screenPosition, {
            clipDirection: 'forward'
          })).toEqual(bufferPosition)

          expect(displayLayer.translateBufferPosition(bufferPosition, {
            clipDirection: 'backward'
          })).toEqual(screenPosition)

          expect(displayLayer.translateBufferPosition(bufferPosition, {
            clipDirection: 'forward'
          })).toEqual(screenPosition)
        }
      }

      tokenScreenStart = tokenScreenEnd
      tokenBufferStart = tokenBufferEnd
    }

    lineBufferStart = traverse(lineBufferStart, screenLine.bufferExtent)
    lineScreenStart = traverse(lineScreenStart, Point(1, 0))
  }
}

function verifyRightmostScreenPosition (displayLayer) {
  const screenLines = displayLayer.getText().split('\n')
  let maxLineLength = -1
  const longestScreenRows = new Set()

  for (const [row, screenLine] of screenLines.entries()) {
    expect(displayLayer.lineLengthForScreenRow(row)).toBe(screenLine.length, ('Screen line length differs for row ' + (row) + '.'))

    if (screenLine.length > maxLineLength) {
      longestScreenRows.clear()
      maxLineLength = screenLine.length
    }

    if (screenLine.length >= maxLineLength) {
      longestScreenRows.add(row)
    }
  }

  const rightmostScreenPosition = displayLayer.getRightmostScreenPosition()
  expect(rightmostScreenPosition.column).toBe(maxLineLength)
  expect(longestScreenRows.has(rightmostScreenPosition.row)).toBe(true)
}

function verifyScreenLineIds (displayLayer, screenLinesById) {
  for (const screenLine of displayLayer.getScreenLines(0, getComputedScreenLineCount(displayLayer))) {
    if (screenLinesById.has(screenLine.id)) {
      expect(screenLinesById.get(screenLine.id)).toEqual(screenLine)
    } else {
      screenLinesById.set(screenLine.id, screenLine)
    }
  }
}

function buildRandomLines (random, maxLines) {
  const lines = []

  for (let i = 0; i < random(maxLines); i++) {
    lines.push(buildRandomLine(random))
  }

  return lines.join('\n')
}

function buildRandomLine (random) {
  const line = []

  for (let i = 0; i < random(5); i++) {
    const n = random(10)

    if (n < 2) {
      line.push('\t')
    } else if (n < 4) {
      line.push(' ')
    } else {
      if (line.length > 0 && !/\s/.test(line[line.length - 1])) {
        line.push(' ')
      }

      line.push(WORDS[random(WORDS.length)])
    }
  }

  return line.join('')
}

function getRandomBufferRange (random, displayLayer) {
  let endRow

  if (random(10) < 8) {
    endRow = random(displayLayer.buffer.getLineCount())
  } else {
    endRow = random(displayLayer.buffer.getLineCount())
  }

  const startRow = random.intBetween(0, endRow)
  const startColumn = random(displayLayer.buffer.lineForRow(startRow).length + 1)
  const endColumn = random(displayLayer.buffer.lineForRow(endRow).length + 1)
  return Range(Point(startRow, startColumn), Point(endRow, endColumn))
}

function expectPositionTranslations (displayLayer, tranlations) {
  for (const [screenPosition, bufferPositions] of tranlations) {
    if (Array.isArray(bufferPositions)) {
      const [backwardBufferPosition, forwardBufferPosition] = bufferPositions

      expect(displayLayer.translateScreenPosition(screenPosition, {
        clipDirection: 'backward'
      })).toEqual(backwardBufferPosition)

      expect(displayLayer.translateScreenPosition(screenPosition, {
        clipDirection: 'forward'
      })).toEqual(forwardBufferPosition)

      expect(displayLayer.clipScreenPosition(screenPosition, {
        clipDirection: 'backward'
      })).toEqual(displayLayer.translateBufferPosition(backwardBufferPosition, {
        clipDirection: 'backward'
      }))

      expect(displayLayer.clipScreenPosition(screenPosition, {
        clipDirection: 'forward'
      })).toEqual(displayLayer.translateBufferPosition(forwardBufferPosition, {
        clipDirection: 'forward'
      }))
    } else {
      const bufferPosition = bufferPositions
      expect(displayLayer.translateScreenPosition(screenPosition)).toEqual(bufferPosition)
      expect(displayLayer.translateBufferPosition(bufferPosition)).toEqual(screenPosition)
    }
  }
}

function expectTokenBoundaries (displayLayer, expectedTokens) {
  const tokenLines = getTokenBoundaries(displayLayer)

  for (const [screenRow, tokens] of tokenLines.entries()) {
    let screenColumn = 0

    for (const token of tokens) {
      if (expectedTokens.length === 0) {
        throw new Error('There are more tokens than expected.')
      }

      const {text, open, close} = expectedTokens.shift()

      expect(token.text).toEqual(text)

      expect(token.closeTags).toEqual(
        close,
        ('Close tags of token with start position ' + (Point(screenRow, screenColumn)))
      )

      expect(token.openTags).toEqual(
        open,
        ('Open tags of token with start position: ' + (Point(screenRow, screenColumn)))
      )

      screenColumn += token.text.length
    }
  }
}

const getTokens = function (displayLayer, startRow = 0, endRow = displayLayer.getScreenLineCount()) {
  const containingTags = []
  const tokenLines = []

  for (const line of getTokenBoundaries(displayLayer, startRow, endRow)) {
    const tokenLine = []
    for (const {closeTags, openTags, text} of line) {
      for (let i = 0; i < closeTags.length; i++) {
        containingTags.pop()
      }

      for (const openTag of openTags) {
        containingTags.push(openTag)
      }

      tokenLine.push({
        tags: containingTags.slice().sort(),
        text: text
      })
    }
    tokenLines.push(tokenLine)
  }
  return tokenLines
}

function getTokenBoundaries (displayLayer, startRow = 0, endRow = displayLayer.getScreenLineCount()) {
  const tokenLines = []

  for (const {lineText, tagCodes} of displayLayer.getScreenLines(startRow, endRow)) {
    const tokens = []
    let startIndex = 0
    let closeTags = []
    let openTags = []

    for (const tagCode of tagCodes) {
      if (displayLayer.isCloseTagCode(tagCode)) {
        closeTags.push(displayLayer.tagForCode(tagCode))
      } else if (displayLayer.isOpenTagCode(tagCode)) {
        openTags.push(displayLayer.tagForCode(tagCode))
      } else {
        tokens.push({
          closeTags: closeTags,
          openTags: openTags,
          text: lineText.substr(startIndex, tagCode)
        })

        startIndex += tagCode
        closeTags = []
        openTags = []
      }
    }

    if (closeTags.length > 0 || openTags.length > 0) {
      tokens.push({
        closeTags: closeTags,
        openTags: openTags,
        text: ''
      })
    }

    tokenLines.push(tokens)
  }

  return tokenLines
}

function updateTokenLines (tokenLines, displayLayer, changes) {
  for (const {start, oldExtent, newExtent} of typeof changes !== 'undefined' && changes !== null ? changes : []) {
    const newTokenLines = getTokens(displayLayer, start.row, start.row + newExtent.row)
    tokenLines.splice(start.row, oldExtent.row, ...newTokenLines)
  }
}

function logTokens (displayLayer) { // eslint-disable-line
  let s = 'expectTokenBoundaries(displayLayer, [\n'

  for (const tokens of getTokenBoundaries(displayLayer)) {
    for (const {text, closeTags, openTags} of tokens) {
      s += ("  {text: '" + (text) + "', close: " + (JSON.stringify(closeTags)) + ', open: ' + (JSON.stringify(openTags)) + '},\n')
    }
  }

  s += '])'
  return console.log(s)
}

function hasComputedAllScreenRows (displayLayer) {
  return displayLayer.indexedBufferRowCount === displayLayer.buffer.getLineCount()
}

function getComputedScreenLineCount (displayLayer) {
  return displayLayer.displayIndex.getScreenLineCount() - 1
}
