(function(f, define){
    define([ "./shapes" ], f);
})(function(){

(function ($) {

    var kendo = window.kendo,
        drawing = kendo.drawing,
        geometry = kendo.geometry,

        Class = kendo.Class,
        Rect = geometry.Rect,
        deepExtend = kendo.deepExtend,
        isArray = $.isArray,
        inArray = $.inArray,

        math = Math,

        LEVEL_STEP = 10000,
        MAX_LEVEL = 75;

        var QuadRoot = Class.extend({
            init: function() {
                this.shapes = [];
            },

            _add: function(shape, bbox) {
                this.shapes.push({
                    bbox: bbox,
                    shape: shape
                });
                shape._quadNode = this;
            },

            pointShapes: function(point) {
                var shapes = this.shapes;
                var length = shapes.length;
                var result = [];
                for (var idx = 0; idx < length; idx++) {
                    if (shapes[idx].bbox.containsPoint(point)) {
                        result.push(shapes[idx].shape);
                    }
                }
                return result;
            },

            insert: function(shape, bbox) {
                this._add(shape, bbox);
            },

            remove: function(shape) {
                var shapes = this.shapes;
                var length = shapes.length;

                for (var idx = 0; idx < length; idx++) {
                    if (shapes[idx].shape === shape) {
                        shapes.splice(idx, 1);
                        break;
                    }
                }
            }
        });

        var QuadNode = QuadRoot.extend({
            init: function(rect) {
                QuadRoot.fn.init.call(this);
                this.children = [];
                this.rect = rect;
            },

            inBounds: function(rect) {
                var nodeRect = this.rect;
                var nodeBottomRight = nodeRect.bottomRight();
                var bottomRight = rect.bottomRight();
                var inBounds = nodeRect.origin.x <= rect.origin.x && nodeRect.origin.y <= rect.origin.y && bottomRight.x <= nodeBottomRight.x &&
                    bottomRight.y <= nodeBottomRight.y;
                return inBounds;
            },

            pointShapes: function(point) {
                var children = this.children;
                var length = children.length;
                var result = QuadRoot.fn.pointShapes.call(this, point);
                for (var idx = 0; idx < length; idx++) {
                    result = result.concat(children[idx].pointShapes(point));
                }
                return result;
            },

            insert: function (shape, bbox) {
                var inserted = false;
                var children = this.children;
                var length = children.length;
                if (this.inBounds(bbox)) {
                    if (!length && this.shapes.length < 4) {
                        this._add(shape, bbox);
                    } else {
                        if (!length) {
                            this._initChildren();
                        }

                        for (var idx = 0; idx < children.length; idx++) {
                            if (children[idx].insert(shape, bbox)) {
                                inserted = true;
                                break;
                            }
                        }

                        if (!inserted) {
                            this._add(shape, bbox);
                        }
                    }
                    inserted = true;
                }

                return inserted;
            },

            _initChildren: function() {
                var rect = this.rect,
                    children = this.children,
                    shapes = this.shapes,
                    center = rect.center(),
                    halfWidth = rect.width() / 2,
                    halfHeight = rect.height() / 2,
                    childIdx, shapeIdx;

                children.push(
                    new QuadNode(new Rect(rect.origin.x, rect.origin.y, halfWidth, halfHeight)),
                    new QuadNode(new Rect(center.x, rect.origin.y, halfWidth, halfHeight)),
                    new QuadNode(new Rect(rect.origin.x, center.y, halfWidth, halfHeight)),
                    new QuadNode(new Rect(center.x, center.y, halfWidth, halfHeight))
                );
                for (shapeIdx = shapes.length - 1; shapeIdx >= 0; shapeIdx--) {
                    for (childIdx = 0; childIdx < children.length; childIdx++) {
                        if (children[childIdx].insert(shapes[shapeIdx].shape, shapes[shapeIdx].bbox)) {
                            shapes.splice(shapeIdx, 1);
                            break;
                        }
                    }
                }
            }
        });

        var ShapesQuadTree = Class.extend({
            ROOT_SIZE: 1000,

            init: function() {
                this.initRoots();
            },

            initRoots: function() {
                this.rootMap = {};
                this.root = new QuadRoot();
                this.rootElements = [];
            },

            clear: function() {
                var that = this;
                var rootElements = that.rootElements;
                for (var idx = 0; idx < rootElements.length; idx++) {
                    this.remove(rootElements[idx]);
                }
                this.initRoots();
            },

            pointShape: function(point) {
                var size = this.ROOT_SIZE;
                var result = this.root.pointShapes(point);
                var sectorRoot = (this.rootMap[math.floor(point.x / size)] || {})[math.floor(point.y / size)];

                if (sectorRoot) {
                    result = result.concat(sectorRoot.pointShapes(point));
                }

                this.assignZindex(result);

                result.sort(zIndexComparer);
                for (var idx = 0; idx < result.length; idx++) {
                    if (result[idx].containsPoint(point)) {
                        return result[idx];
                    }
                }
            },

            assignZindex: function (elements) {
                var element, levelWeight, zIndex, parents;

                for (var idx = 0; idx < elements.length; idx++) {
                    element = elements[idx];
                    zIndex = 0;
                    levelWeight = math.pow(LEVEL_STEP, MAX_LEVEL);
                    parents = [];
                    while (element) {
                        parents.push(element);
                        element = element.parent;
                    }

                    while(parents.length) {
                        element = parents.pop();
                        zIndex += (inArray(element, element.parent ? element.parent.children: this.rootElements) + 1) * levelWeight;
                        levelWeight /= LEVEL_STEP;
                    }

                    elements[idx]._zIndex = zIndex;
                }
            },

            optionsChange: function(e) {
                if (e.field == "transform" || e.field == "stroke.width") {
                    this.bboxChange(e.element);
                }
            },

            geometryChange: function(e) {
                this.bboxChange(e.element);
            },

            bboxChange: function(element) {
                if (element.nodeType === "Group") {
                    for (var idx = 0; idx < element.children.length; idx++) {
                        this.bboxChange(element.children[idx]);
                    }
                } else {
                    if (element._quadNode) {
                        element._quadNode.remove(element);
                    }
                    this._insertShape(element);
                }
            },

            add: function(elements) {
                var elementsArray = isArray(elements) ? elements.slice(0) : [elements];

                this.rootElements.push.apply(this.rootElements, elementsArray);
                this._insert(elementsArray);
            },

            childrenChange: function(e) {
                if (e.action == "remove") {
                    for (var idx = 0; idx < e.items.length; idx++) {
                        this.remove(e.items[idx]);
                    }
                } else {
                   this._insert(Array.prototype.slice.call(e.items, 0));
                }
            },

            _insert: function(elements) {
                var element;

                while (elements.length > 0) {
                    element = elements.pop();
                    element.addObserver(this);
                    if (element.nodeType == "Group") {
                        elements.push.apply(elements, element.children);
                    } else {
                        this._insertShape(element);
                    }
                }
            },

            _insertShape: function(shape) {
                var bbox = shape.bbox();
                if (bbox) {
                    var rootSize = this.ROOT_SIZE;
                    var sectors = this.getSectors(bbox);
                    var x = sectors[0][0];
                    var y = sectors[1][0];

                    if (this.inRoot(sectors)) {
                        this.root.insert(shape, bbox);
                    } else {
                        if (!this.rootMap[x]) {
                            this.rootMap[x] = {};
                        }

                        if (!this.rootMap[x][y]) {
                            this.rootMap[x][y] = new QuadNode(
                                new Rect([x * rootSize, y * rootSize], [rootSize, rootSize])
                            );
                        }

                        this.rootMap[x][y].insert(shape, bbox);
                    }
                }
            },

            remove: function(element) {
                element.removeObserver(this);

                if (element.nodeType == "Group") {
                    var children = element.children;
                    for (var idx = 0; idx < children.length; idx++) {
                        this.remove(children[idx]);
                    }
                } else if (element._quadNode) {
                    element._quadNode.remove(element);
                    delete element._quadNode;
                }
            },

            inRoot: function(sectors) {
                return sectors[0].length > 1 || sectors[1].length > 1;
            },

            getSectors: function(rect) {
                var rootSize = this.ROOT_SIZE;
                var bottomRight = rect.bottomRight();
                var bottomX = math.floor(bottomRight.x / rootSize);
                var bottomY = math.floor(bottomRight.y / rootSize);
                var sectors = [[],[]];
                for (var x = math.floor(rect.origin.x / rootSize); x <= bottomX; x++) {
                    sectors[0].push(x);
                }
                for (var y = math.floor(rect.origin.y / rootSize); y <= bottomY; y++) {
                    sectors[1].push(y);
                }
                return sectors;
            }
        });

        function zIndexComparer(x1, x2) {
            if (x1._zIndex < x2._zIndex) {
                return 1;
            }
            if (x1._zIndex > x2._zIndex) {
                return -1;
            }

            return 0;
        }

    // Exports ================================================================

    deepExtend(drawing, {
        ShapesQuadTree: ShapesQuadTree
    });

})(window.kendo.jQuery);

}, typeof define == 'function' && define.amd ? define : function(a1, a2, a3){ (a3 || a2)(); });