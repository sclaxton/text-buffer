MarkerIndex = require 'marker-index'
Patch = require 'atom-patch'
Random = require 'random-seed'
{Emitter} = require 'event-kit'
{compare: comparePoints, isEqual: isEqualPoint, min: minPoint} = require('../../src/point-helpers')
Point = require '../../src/point'
Range = require '../../src/range'
WORDS = require './words'

module.exports =
class TestDecorationLayer
  constructor: (decorations, @buffer, @random) ->
    @nextInvalidationRangeId = 1
    @nextMarkerId = 1
    @markerIndex = new MarkerIndex
    @tagsByMarkerId = {}
    @emitter = new Emitter
    @invalidatedRangesIndex = null

    for [tag, [rangeStart, rangeEnd]] in decorations
      markerId = @nextMarkerId++
      @markerIndex.insert(markerId, Point.fromObject(rangeStart), Point.fromObject(rangeEnd))
      @tagsByMarkerId[markerId] = tag

    @buffer?.preemptDidChange(@bufferDidChange.bind(this))

  buildIterator: ->
    new TestDecorationLayerIterator(this)

  getInvalidatedRanges: ->
    invalidatedRanges = []
    for id, range of @invalidatedRangesIndex.dump()
      invalidatedRanges.push(range)
    @invalidatedRangesIndex = null
    invalidatedRanges

  onDidInvalidateRange: (fn) ->
    @emitter.on 'did-invalidate-range', fn

  emitInvalidateRangeEvent: (range) ->
    @emitter.emit 'did-invalidate-range', range

  containingTagsForPosition: (position) ->
    containingIds = @markerIndex.findContaining(position, position)
    @markerIndex.findEndingAt(position).forEach (id) -> containingIds.delete(id)
    Array.from(containingIds).map (id) => @tagsByMarkerId[id]

  bufferDidChange: ({oldRange, newRange}) ->
    @invalidatedRangesIndex ?= new MarkerIndex
    @invalidatedRangesIndex.splice(oldRange.start, oldRange.getExtent(), newRange.getExtent())
    {inside, overlap} = @markerIndex.splice(oldRange.start, oldRange.getExtent(), newRange.getExtent())
    for id in Array.from(inside).concat(Array.from(overlap))
      [start, end] = @markerIndex.getRange(id)
      @invalidatedRangesIndex.insert(@nextInvalidationRangeId++, start, end)

    for i in [0..@random(5)]
      markerId = @nextMarkerId++
      @tagsByMarkerId[markerId] = WORDS[@random(WORDS.length)]
      range = @getRandomRange()
      @markerIndex.insert(markerId, range.start, range.end)
      @invalidatedRangesIndex.insert(@nextInvalidationRangeId++, range.start, range.end)

  getRandomRange: ->
    Range(@getRandomPoint(), @getRandomPoint())

  getRandomPoint: ->
    row = @random(@buffer.getLineCount())
    column = @random(@buffer.lineForRow(row).length + 1)
    Point(row, column)

class TestDecorationLayerIterator
  constructor: (@layer) ->
    {markerIndex, tagsByMarkerId} = @layer

    emptyMarkers = []
    nonEmptyMarkers = []
    for key in Object.keys(tagsByMarkerId)
      id = parseInt(key)
      if isEqualPoint(markerIndex.getStart(id), markerIndex.getEnd(id))
        emptyMarkers.push(id)
      else
        nonEmptyMarkers.push(id)

    emptyMarkers.sort (a, b) ->
      comparePoints(markerIndex.getStart(a), markerIndex.getStart(b)) or a - b

    markersSortedByStart = nonEmptyMarkers.slice().sort (a, b) ->
      comparePoints(markerIndex.getStart(a), markerIndex.getStart(b)) or a - b

    markersSortedByEnd = nonEmptyMarkers.slice().sort (a, b) ->
      comparePoints(markerIndex.getEnd(a), markerIndex.getEnd(b)) or b - a

    @boundaries = []

    nextEmptyMarkerStart = -> emptyMarkers.length > 0 and markerIndex.getStart(emptyMarkers[0])
    nextMarkerStart = -> markersSortedByStart.length > 0 and markerIndex.getStart(markersSortedByStart[0])
    nextMarkerEnd = -> markersSortedByEnd.length > 0 and markerIndex.getEnd(markersSortedByEnd[0])

    while emptyMarkers.length > 0 or markersSortedByStart.length > 0 or markersSortedByEnd.length > 0
      boundary = {
        position: Point.INFINITY
        closeTags: []
        openTags: []
      }

      if nextMarkerStart()
        boundary.position = minPoint(boundary.position, nextMarkerStart())
      if nextEmptyMarkerStart()
        boundary.position = minPoint(boundary.position, nextEmptyMarkerStart())
      if nextMarkerEnd()
        boundary.position = minPoint(boundary.position, nextMarkerEnd())

      while nextMarkerEnd() and isEqualPoint(nextMarkerEnd(), boundary.position)
        boundary.closeTags.push(tagsByMarkerId[markersSortedByEnd.shift()])

      emptyTags = []
      while nextEmptyMarkerStart() and isEqualPoint(nextEmptyMarkerStart(), boundary.position)
        emptyTags.push(tagsByMarkerId[emptyMarkers.shift()])

      if emptyTags.length > 0
        boundary.openTags.push(emptyTags...)
        @boundaries.push(boundary)
        boundary = {
          position: boundary.position
          closeTags: []
          openTags: []
        }
        boundary.closeTags.push(emptyTags...)

      while nextMarkerStart() and isEqualPoint(nextMarkerStart(), boundary.position)
        boundary.openTags.push(tagsByMarkerId[markersSortedByStart.shift()])

      @boundaries.push(boundary)

  seek: (position) ->
    containingTags = []
    for boundary, index in @boundaries
      if comparePoints(boundary.position, position) >= 0
        @boundaryIndex = index
        return containingTags
      else
        for tag in boundary.closeTags
          containingTags.splice(containingTags.lastIndexOf(tag), 1)
        containingTags.push(boundary.openTags...)
    @boundaryIndex = @boundaries.length
    containingTags

  moveToSuccessor: ->
    @boundaryIndex++

  getPosition: ->
    @boundaries[@boundaryIndex]?.position ? Point.INFINITY

  getCloseTags: ->
    @boundaries[@boundaryIndex]?.closeTags ? []

  getOpenTags: ->
    @boundaries[@boundaryIndex]?.openTags ? []