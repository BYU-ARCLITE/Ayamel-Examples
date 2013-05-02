/*
 Captionator 0.5.1 [CaptionCrunch]
 Christopher Giffard, 2011
 Share and enjoy

 https://github.com/cgiffard/Captionator
 */
var CaptionRenderer = (function() {
    "use strict";

    /*	positionCue(DOMNode, cueObject, videoNode)
     Styles and positions cue nodes according to the WebVTT specification.
     First parameter: The DOMNode representing the cue to style. This parameter is mandatory.
     Second parameter: The TextTrackCue itself.
     Third Parameter: The HTMLVideoElement with which the cue is associated. This parameter is mandatory.
     */
    var positionCue = (function(){
        // Function to facilitate vertical text alignments in browsers which do not support writing-mode
        // (sadly, all the good ones!)
        function spanify(DOMNode,fontSize,lineHeight,chars) {
            var characterCount = 0,
                templateNode = document.createElement('span');
            templateNode.className = 'captionator-cue-character';
            applyStyles(templateNode,{
                "height":	fontSize + "px",
                "width":	lineHeight + "px"
            });
            [].forEach.call(DOMNode.childNodes,function(currentNode,nodeIndex) {
                var replacementNode;
                if (currentNode.nodeType === 3) {
                    replacementNode = document.createElement("span");
                    currentNode.nodeValue
                        .split(/(.)/)
                        .forEach(function(s){
                            if(!s.length){ return; }
                            var ch = templateNode.cloneNode(false);
                            ch.textContent = s;
                            replacementNode.appendChild(ch);
                            chars.push(ch)
                        });
                    currentNode.parentNode.replaceChild(replacementNode,currentNode);
                } else if (DOMNode.childNodes[nodeIndex].nodeType === 1) {
                    spanify(DOMNode.childNodes[nodeIndex],fontSize,lineHeight,chars);
                }
            });
            return chars;
        }
        function getspanchars(DOMNode,fontSize,lineHeight,chars) {
            [].push.apply(chars,DOMNode.querySelectorAll('.captionator-cue-character'));
            return chars;
        }
        /* checkDirection(text)
         Determines whether the text string passed into the function is an RTL (right to left) or LTR (left to right) string.
         RETURNS: 'rtl' if the text is a right to left string, 'ltr' if the text is a left to right string, or an empty string
         if the direction could not be determined.
         */
        function checkDirection(text) {
            // Inspired by http://www.frequency-decoder.com/2008/12/12/automatically-detect-rtl-text
            var ltrChars            = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF',
                rtlChars            = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC',
                ltrDirCheckRe       = new RegExp('^[^'+rtlChars+']*['+ltrChars+']'),
                rtlDirCheckRe       = new RegExp('^[^'+ltrChars+']*['+rtlChars+']');
            return !!rtlDirCheckRe.test(text) ? 'rtl' : (!!ltrDirCheckRe.test(text) ? 'ltr' : '');
        }
        return function(DOMNode, cueObject, renderer, videoMetrics, vert) {
            // Variables for maintaining render calculations
            var videoElement = renderer.element,
                cueX = 0, cueY = 0, cueWidth = 0, cueHeight = 0, cuePaddingLR = 0, cuePaddingTB = 0,
                cueSize, cueLine, cueVertical = cueObject.vertical, cueSnap = cueObject.snapToLines, cuePosition = cueObject.position,
                baseFontSize, basePixelFontSize, baseLineHeight,
                videoHeightInLines, videoWidthInLines, pixelLineHeight, verticalPixelLineHeight,
                maxCueSize = 100, textBoundingBoxWidth = 0, textBoundingBoxPercentage = 0, autoSize = true,
                availableCueArea = renderer.availableCueArea;

            // Calculate font metrics
            baseFontSize = Math.max(((videoMetrics.height * renderer.fontSizeRatio)/96)*72, renderer.minFontSize);
            basePixelFontSize = Math.floor((baseFontSize/72)*96);
            baseLineHeight = Math.max(Math.floor(baseFontSize * renderer.lineHeightRatio), renderer.minLineHeight);
            pixelLineHeight = Math.ceil((baseLineHeight/72)*96);
            verticalPixelLineHeight	= pixelLineHeight;

            if (pixelLineHeight * Math.floor(videoMetrics.height / pixelLineHeight) < videoMetrics.height) {
                pixelLineHeight = Math.floor(videoMetrics.height / Math.floor(videoMetrics.height / pixelLineHeight));
                baseLineHeight = Math.ceil((pixelLineHeight/96)*72);
            }

            if (pixelLineHeight * Math.floor(videoMetrics.width / pixelLineHeight) < videoMetrics.width) {
                verticalPixelLineHeight = Math.ceil(videoMetrics.width / Math.floor(videoMetrics.width / pixelLineHeight));
            }

            // Calculate render area height & width in lines
            videoHeightInLines = Math.floor(availableCueArea.height / pixelLineHeight);
            videoWidthInLines = Math.floor(availableCueArea.width / verticalPixelLineHeight);

            if (cueVertical === "") {
                // Calculate text bounding box
                // (isn't useful for vertical cues, because we're doing all glyph positioning ourselves.)
                DOMNode.style.display = "inline-block";
                textBoundingBoxWidth = parseInt(DOMNode.offsetWidth,10);
                textBoundingBoxPercentage = Math.floor((textBoundingBoxWidth / availableCueArea.width) * 100);
                textBoundingBoxPercentage = textBoundingBoxPercentage <= 100 ? textBoundingBoxPercentage : 100;

                cuePaddingLR = Math.floor(videoMetrics.width/100);
            }else{
                cuePaddingTB = Math.floor(videoMetrics.height/100);
            }

            //http://dev.w3.org/html5/webvtt/#applying-css-properties-to-webvtt-node-objects
            //not quite perfect compliance, but close, especially given vertical-text hacks
            applyStyles(DOMNode,{
                "position": "absolute",
                "unicodeBidi": "plaintext",
                "overflow": "hidden",
                "height": pixelLineHeight + "px", //so the scrollheight has a baseline to work from
                "padding": cuePaddingTB + "px " + cuePaddingLR + "px",
                "textAlign": (cueVertical !== "")?"":(cueObject.align === "middle"?"center":cueObject.align),
                "backgroundColor": renderer.cueBgColor,
                "direction": checkDirection(String(cueObject.text)),
                "lineHeight": baseLineHeight + "pt",
                "boxSizing": "border-box"
            });

            // Calculate cue size
            if (renderer.sizeCuesByTextBoundingBox && cueObject.size === 100) {
                // We assume (given a size of 100) that no explicit size was set.
                cueSize = textBoundingBoxPercentage;
            } else {
                cueSize = cueObject.size;
                autoSize = false;
            }

            cueLine =	(cueObject.line !== "auto")?parseFloat(cueObject.line):
                (cueVertical === "")?"auto":
                    videoWidthInLines;



            if (cueVertical === "") {
                if (autoSize) { // Don't squish the text
                    cueSize = (cueSize - cuePosition > textBoundingBoxPercentage)
                        ?cueSize-cuePosition:textBoundingBoxPercentage;
                }
                cueWidth = (cueLine === 'auto'?availableCueArea:videoMetrics).width * cueSize/100;
                cueX = ((availableCueArea.right - cueWidth) * (cuePosition/100)) + availableCueArea.left;
                DOMNode.style.width = cueWidth + "px";
                DOMNode.style.left = cueX + "px";

                if (cueSnap) {
                    cueHeight = Math.round(DOMNode.scrollHeight/pixelLineHeight)*pixelLineHeight;
                    if(cueLine === 'auto'){
                        cueY = availableCueArea.height + availableCueArea.top - cueHeight;
                    }else{
                        cueY = cueLine < 0
                            ?videoMetrics.height-cueHeight+(1+cueLine)*pixelLineHeight
                            :cueLine*pixelLineHeight;
                    }
                } else {
                    cueHeight = DOMNode.scrollHeight;
                    cueY = (videoMetrics.height - cueHeight - 2*cuePaddingTB) * (cueLine/100);
                }
                DOMNode.style.height = cueHeight + "px";
                DOMNode.style.top = cueY + "px";

                // Work out how to shrink the available render area
                // If subtracting from the bottom works out to a larger area, subtract from the bottom.
                // Otherwise, subtract from the top.
                if ((cueY - 2*availableCueArea.top) >=
                    (availableCueArea.bottom - (cueY + cueHeight)) &&
                    availableCueArea.bottom > cueY) {
                    availableCueArea.bottom = cueY;
                } else if (availableCueArea.top < cueY + cueHeight) {
                    availableCueArea.top = cueY + cueHeight;
                }
                availableCueArea.height = availableCueArea.bottom - availableCueArea.top;

            } else {
                cueHeight = availableCueArea.height * (cueSize/100);
                // Work out CueY taking into account textPosition...
                cueY = ((availableCueArea.bottom - cueHeight) * (cuePosition/100)) +
                    availableCueArea.top;

                (function(){	// Split into characters, and continue calculating width & positioning with new info
                    var currentLine = 0, characterPosition = 0,
                        characters = (vert?spanify:getspanchars)(DOMNode,basePixelFontSize,verticalPixelLineHeight,[]),
                        characterCount = characters.length,
                        charactersPerLine = Math.floor((cueHeight-cuePaddingTB*2)/basePixelFontSize),
                        lineCount = Math.ceil(characterCount/charactersPerLine),
                        finalLineCharacterCount = characterCount - (charactersPerLine * (lineCount - 1)),
                        finalLineCharacterHeight = finalLineCharacterCount * basePixelFontSize;

                    cueWidth = Math.ceil(characterCount/charactersPerLine) * verticalPixelLineHeight;

                    // Work out CueX taking into account linePosition...
                    cueX = cueSnap?(cueVertical === "lr" ? availableCueArea.left : availableCueArea.right - cueWidth)
                        :((videoMetrics.width - (cueWidth + (cuePaddingLR * 2))) * (cueVertical === "lr"?cueLine/100:1-cueLine/100));

                    // Iterate through the characters and position them accordingly...
                    characters.forEach(function(characterSpan) {
                        var characterY,
                            characterX = (cueVertical === "lr")
                                ?verticalPixelLineHeight * currentLine:cueWidth - (verticalPixelLineHeight * (currentLine+1));

                        if(currentLine < (lineCount-1)) {
                            characterY = (characterPosition * basePixelFontSize) + cuePaddingTB;
                        }else switch(cueObject.align){
                            case "start":
                            case "right": //hack
                                characterY = (characterPosition * basePixelFontSize) + cuePaddingTB;
                                break;
                            case "end":
                            case "left":
                                characterY = ((characterPosition * basePixelFontSize)-basePixelFontSize) + ((cueHeight+(cuePaddingTB*2))-finalLineCharacterHeight);
                                break;
                            case "middle":
                                characterY = (((cueHeight - (cuePaddingTB*2))-finalLineCharacterHeight)/2) + (characterPosition * basePixelFontSize);
                        }

                        characterSpan.style.top = characterY + "px";
                        characterSpan.style.left = characterX + "px";

                        if (characterPosition >= charactersPerLine-1) {
                            characterPosition = 0;
                            currentLine ++;
                        } else {
                            characterPosition ++;
                        }
                    });
                }());

                applyStyles(DOMNode,{
                    width: cueWidth + "px",
                    height: cueHeight + "px",
                    left: cueX + "px",
                    top: cueY + "px"
                });

                // Work out how to shrink the available render area
                // If subtracting from the right works out to a larger area, subtract from the right.
                // Otherwise, subtract from the left.
                if (((cueX - availableCueArea.left) - availableCueArea.left) >=
                    (availableCueArea.right - (cueX + cueWidth))) {
                    availableCueArea.right = cueX;
                } else {
                    availableCueArea.left = cueX + cueWidth;
                }
                availableCueArea.width = availableCueArea.right - availableCueArea.left;
            }
        };
    }());
    /* getDisplayMetrics(DOMNode)
     An object with the following properties:
     left: The calculated left offset of the display
     top: The calculated top offset of the display
     height: The calculated height of the display
     width: The calculated width of the display
     */
    function getDisplayMetrics(renderer) {
        var UA, offsetObject = renderer.element,
            nodeComputedStyle = window.getComputedStyle(offsetObject,null),
            offsetTop = 0, offsetLeft = 0, controlHeight = 0;

        if (typeof renderer.controlHeight === 'number'){
            controlHeight = renderer.controlHeight;
        }else if (offsetObject.hasAttribute("controls")) {
            // Get heights of default control strip in various browsers
            // There could be a way to measure this live but I haven't thought/heard of it yet...
            UA = navigator.userAgent.toLowerCase();
            controlHeight =	(UA.indexOf("chrome") !== -1)?35:
                (UA.indexOf("opera") !== -1)?25:
                    (UA.indexOf("firefox") !== -1)?28:
                        (UA.indexOf("ie 9") !== -1)?44:
                            (UA.indexOf("ipad") !== -1)?44:
                                (UA.indexOf("safari") !== -1)?25:
                                    0;
        }

        while(offsetObject && offsetObject !== renderer.appendCueCanvasTo){
            offsetTop += offsetObject.offsetTop;
            offsetLeft += offsetObject.offsetLeft;
            offsetObject = offsetObject.offsetParent;
        }

        return {
            left: offsetLeft,
            top: offsetTop,
            width: parseInt(nodeComputedStyle.getPropertyValue("width"),10),
            height: parseInt(nodeComputedStyle.getPropertyValue("height"),10)-controlHeight
        };
    }
    /* applyStyles(DOMNode, Style Object)
     A fast way to apply multiple CSS styles to a DOMNode
     First parameter: DOMNode to style
     Second parameter: An object where the keys are camel-cased CSS property names
     */
    function applyStyles(Node, styleObject) {
        var style = Node.style;
        Object.keys(styleObject).forEach(function(styleName){
            style[styleName] = styleObject[styleName];
        });
    }

    function defaultRenderCue(cue){
        var node = document.createElement('div');
        node.appendChild(cue.getCueAsHTML(cue.track.kind==='subtitles'));
        return {node:node};
    }

    function cueTime(cue,currentTime){
        //find the last timestamp in the past and the first in the future
        var i, node, ntime, otime = 0,
            timeNodes = cue.getCueAsHTML(cue.track.kind==='subtitles').querySelectorAll("i[data-target=timestamp]");
        for(i=0;node=timeNodes[i];i++){
            ntime = node.dataset.seconds;
            if(ntime > currentTime){ break; }
            otime = ntime;
        }
        return otime;
    }

    function hashCode(str){
        var hash, i;
        for(hash = i = 0; i < str.length; i++){
            hash = ((hash<<5)-hash+str.charCodeAt(i))|0; //bitwise or forces to 32-bit integer
        }
        return hash.toString(16);
    };

    function defaultHashCue(cue){
        return hashCode(cue.text)
            +cue.startTime
            +cue.endTime
            +cue.size
            +cue.vertical
            +cue.line
            +cue.position
            +cue.align;
    }

    /* CaptionRenderer([dom element],
     [options - JS Object])

     Adds closed captions to video elements. The first, second and third parameter are both optional.
     First parameter: Use an array of either DOMElements or selector strings (compatible with querySelectorAll.)
     All of these elements will be captioned if tracks are available. If this parameter is omitted, all video elements
     present in the DOM will be captioned if tracks are available.
     */
    function CaptionRenderer(element,options) {
        if(!(this instanceof CaptionRenderer)){ return new CaptionRenderer(element,options); }
        options = options instanceof Object? options : {};
        var media, renderer = this,
            timeupdate = function(){ renderer.currentTime = media.currentTime; },
            container = document.createElement("div"),
            containerID = "captionator-canvas-"+(Math.random()*9999).toString(16),
            internalTime = 0,
            appendCueCanvasTo = (options.appendCueCanvasTo instanceof HTMLElement)?options.appendCueCanvasTo:null,
            minFontSize = (typeof(options.minFontSize) === "number")?options.minFontSize:10,			//pt
            minLineHeight = (typeof(options.minimumLineHeight) === "number")?options.minLineHeight:16,	//pt
            fontSizeRatio = (typeof(options.fontSizeRatio) === "number")?options.fontSizeRatio:0.045,	//	Caption font size is 4.5% of the video height
            lineHeightRatio = (typeof(options.lineHeightRatio) === "number")?options.lineHeightRatio:1.3,	//	Caption line height is 1.3 times the font size
            sizeCuesByTextBoundingBox = !!options.sizeCuesByTextBoundingBox,
            cueBgColor = (typeof(options.cueBgColor) === "string")?options.cueBgColor:"rgba(0,0,0,0.5)",
            hashCue = typeof options.hashCue === 'function'?options.hashCue:defaultHashCue,
            renderCue = typeof options.renderCue === 'function'?options.renderCue:defaultRenderCue;

        container.id = containerID;
        container.className = "captionator-cue-canvas";

        if (String(element.getAttribute("aria-describedby")).indexOf(containerID) === -1) {
            element.setAttribute("aria-describedby",(element.hasAttribute("aria-describedby") ? element.getAttribute("aria-describedby") + " " : "")+containerID);
        }

        this.container = container;
        this.tracks = [];
        this.element = element;
        this.currentNodes = [];
        this.hash = "";
        this.timeHash = "";

        element.classList.add("captioned");

        window.addEventListener("resize", this.refreshLayout.bind(this) ,false);
        this.bindMediaElement = function(element) {
            media && media.removeEventListener('timeupdate',timeupdate,false);
            media = element;
            media && media.addEventListener('timeupdate',timeupdate,false);
        };

        Object.defineProperties(this,{
            currentTime: {
                get: function(){ return internalTime; },
                set: function(time){
                    internalTime = +time || 0;
                    // update active cues
                    try{ this.tracks.forEach(function(track) { track.currentTime = internalTime; }); }
                    catch(error) {}
                    this.rebuildCaptions(false);
                },
                enumerable: true
            },
            appendCueCanvasTo: {
                get: function(){ return appendCueCanvasTo; },
                set: function(val){
                    appendCueCanvasTo = (val instanceof HTMlElement)?val:null;
                    this.refreshLayout();
                    return appendCueCanvasTo;
                },
                enumerable: true
            },
            minFontSize: {
                get: function(){ return minFontSize; },
                set: function(val){
                    val = +val;
                    if(!isNaN(val)){
                        minFontSize = val;
                        this.refreshLayout();
                    }
                    return minFontSize;
                },
                enumerable: true
            },
            minLineHeight: {
                get: function(){ return minLineHeight; },
                set: function(val){
                    val = +val;
                    if(!isNaN(val)){
                        minLineHeight = val;
                        this.refreshLayout();
                    }
                    return minLineHeight;
                },
                enumerable: true
            },
            fontSizeRatio: {
                get: function(){ return fontSizeRatio; },
                set: function(val){
                    val = +val;
                    if(!isNaN(val)){
                        fontSizeRatio = val;
                        this.refreshLayout();
                    }
                    return fontSizeRatio;
                },
                enumerable: true
            },
            lineHeightRatio: {
                get: function(){ return lineHeightRatio; },
                set: function(val){
                    val = +val;
                    if(!isNaN(val)){
                        lineHeightRatio = val;
                        this.refreshLayout();
                    }
                    return lineHeightRatio;
                },
                enumerable: true
            },
            sizeCuesByTextBoundingBox: {
                get: function(){ return sizeCuesByTextBoundingBox; },
                set: function(val){
                    sizeCuesByTextBoundingBox = !!val;
                    this.refreshLayout();
                    return sizeCuesByTextBoundingBox;
                },
                enumerable: true
            },
            cueBgColor: {
                get: function(){ return cueBgColor; },
                set: function(val){
                    cueBgColor = ""+val;
                    this.rebuildCaptions(true);
                    return cueBgColor;
                },
                enumerable: true
            },
            hashCue: {
                get: function(){ return hashCue; },
                set: function(val){
                    hashCue = typeof val === 'function'?val:defaultHashCue;
                    return hashCue;
                },
                enumerable: true
            },
            renderCue: {
                get: function(){ return renderCue; },
                set: function(val){
                    renderCue = typeof val === 'function'?val:defaultRenderCue;
                    this.refreshLayout();
                    return renderCue;
                },
                enumerable: true
            }
        });
    }

    CaptionRenderer.prototype.addTextTrack = function(kind,label,language) {
        var newTrack;
        if(kind instanceof TextTrack){
            newTrack = kind;
        }else{
            newTrack = new TextTrack(
                typeof(kind) === "string" ? kind : "",
                typeof(label) === "string" ? label : "",
                typeof(language) === "string" ? language : "");
            newTrack.readyState = TextTrack.LOADED;
        }
        if (newTrack) {
            this.tracks.push(newTrack);
            newTrack.renderer = this;
            return newTrack;
        }
        return null;
    };

    (function(){
        /* styleCueContainer(renderer)
         Styles and positions a div for displaying cues on a video.
         */
        function styleCueContainer(renderer,videoMetrics) {
            var container = renderer.container,
                videoElement = renderer.element,
                videoMetrics, baseFontSize, baseLineHeight;

            if (!container.parentNode) {
                ((renderer.appendCueCanvasTo instanceof HTMLElement)
                    ?renderer.appendCueCanvasTo
                    :document.body).appendChild(container);
            }

            // Set up font metrics
            baseFontSize = Math.max(((videoMetrics.height * renderer.fontSizeRatio)/96)*72,renderer.minFontSize);
            baseLineHeight = Math.max(Math.floor(baseFontSize * renderer.lineHeightRatio),renderer.minLineHeight);

            // Style node!
            applyStyles(container,{
                "height": videoMetrics.height + "px",
                "width": videoMetrics.width + "px",
                "top": videoMetrics.top + "px",
                "left": videoMetrics.left + "px",
                "color": "white",
                "fontFamily": "Verdana, Helvetica, Arial, sans-serif",
                "fontSize": baseFontSize + "pt",
                "lineHeight": baseLineHeight + "pt"
            });
        }

        function parse_timestamp(str){
            var data = str.match(/(\d\d+):(\d\d):(\d\d).(\d\d\d)/);
            return parseInt(data[1],10)*3600+parseInt(data[2],10)*60+parseInt(data[3],10)+parseFloat("0."+data[4]);
        }

        function set_node_time(node,pos){
            var newnode;
            switch(node.nodeType){
                case Node.TEXT_NODE:
                    newnode = document.createElement('span');
                    node.parentNode.replaceChild(newnode,node);
                    newnode.appendChild(node);
                    node = newnode;
                case Node.ELEMENT_NODE:
                    node.dataset['time-position'] = pos;
            }
        }

        function markTimes(DOM,currentTime){
            //depth-first traversal of the cue DOM
            var i, node, time, children, timeNodes,
                pastNode = null,
                futureNode = null;

            //find the last timestamp in the past and the first in the future
            timeNodes = DOM.querySelectorAll("i[data-target=timestamp]");
            if(timeNodes.length === 0){ return 0; }
            for(i=0;node=timeNodes[i];i++){
                time = node.dataset.seconds;
                if(time < currentTime){ pastNode = node; }
                else if(time > currentTime){ futureNode = node; break; }
            }
            //mark nodes as past or future appropriately
            children = [].slice.call(DOM.childNodes,0);
            while(children.length){
                node = children.pop();
                if(pastNode && node.compareDocumentPosition(pastNode) === 4){ //pastNode is following
                    set_node_time(node,"past");
                }else if(futureNode && node.compareDocumentPosition(futureNode) === 2){ //futureNode is preceding
                    set_node_time(node,"future");
                }else{
                    set_node_time(node,"present");
                }
                if(node.childNodes){ children.push.apply(children,node.childNodes); }
            }
            return pastNode?pastNode.dataset.seconds:0;
        }

        function timeStyle(node){ //TODO: read stylesheets
            [].forEach.call(node.querySelectorAll('[data-time-position]'),function(element){
                switch(node.dataset['time-position']){
                    case "past":
                        element.style.visibility = "hidden";
                    case "present":
                    case "future":
                        element.style.visibility = "";
                }
            });
        }

        CaptionRenderer.prototype.rebuildCaptions = function(dirtyBit) {
            var renderer = this,
                cache = this.cache,
                container = this.container,
                currentTime = this.currentTime,
                hashCue = renderer.hashCue,
                renderCue = renderer.renderCue,
                videoMetrics = getDisplayMetrics(this),
                compositeActiveCues = [],
                hash = "", timeHash = "";

            // Work out what cues are showing...
            //WHY IS IT SKIPPING CUES?
            this.tracks.forEach(function(track) {
                if (track.mode === "showing" && track.readyState === TextTrack.LOADED){
                    if(track.kind === "captions" || track.kind === "subtitles"/* || track.kind === "descriptions")*/) {
                        // Since the render area decreases in size with each successive cue added,
                        // and we want cues which are older to be displayed above cues which are newer,
                        // we sort active cues within each track so that older ones are rendered first.
                        [].push.apply(compositeActiveCues,[].slice.call(track.activeCues,0).sort(function(cueA, cueB) {
                            return (cueA.startTime > cueB.startTime)? -1 : 1;
                        }));
                    }
                    //TODO: we should do aria-live on descriptions and those don't need visual display
                    //container.setAttribute("aria-live","polite");
                    //container.setAttribute("aria-atomic","true");
                }
            });

            // If any of them are different, we redraw them to the screen.
            hash = compositeActiveCues.map(function(cue){ return hashCue(cue); }).join();
            if(dirtyBit || (this.hash !== hash)){
                // Get the canvas ready if it isn't already
                container.style.visibility = "hidden";
                styleCueContainer(this,videoMetrics);
                container.innerHTML = "";
                // Define storage for the available cue area, diminished as further cues are added
                // Cues occupy the largest possible area they can, either by width or height
                // (depending on whether the 'direction' of the cue is vertical or horizontal)
                // Cues which have an explicit position set do not detract from this area.
                this.availableCueArea = {
                    "top": 0, "left": 0,
                    "bottom": videoMetrics.height,
                    "right": videoMetrics.width,
                    "height": videoMetrics.height,
                    "width": videoMetrics.width
                };
                this.currentNodes.forEach(function(nObj){
                    if(typeof nObj.cleanup === 'function'){
                        nObj.cleanup();
                    }
                });
                this.currentNodes = compositeActiveCues.map(function(cue){
                    var nObj = renderCue(cue);
                    nObj.cue = cue;
                    return nObj;
                });
                this.timeHash = "";
                this.currentNodes.forEach(function(nObj){
                    var node = nObj.node;
                    node.className = "captionator-cue";

                    //Handle karaoke styling
                    timeHash += markTimes(node,currentTime);
                    timeStyle(node);

                    container.appendChild(node);
                    positionCue(node,nObj.cue,renderer,videoMetrics,true);
                });
                container.style.visibility = "visible";
                this.hash = hash;
                this.timeHash = timeHash;
            }else{
                timeHash = this.currentNodes.map(function(nObj){ return cueTime(nObj.cue,currentTime); }).join();
                if(this.timeHash !== timeHash){
                    container.style.visibility = "hidden";
                    this.availableCueArea = {
                        "top": 0, "left": 0,
                        "bottom": videoMetrics.height,
                        "right": videoMetrics.width,
                        "height": videoMetrics.height,
                        "width": videoMetrics.width
                    };
                    this.currentNodes.forEach(function(nObj){
                        var node = nObj.node;
                        markTimes(node,currentTime);
                        timeStyle(node);
                        positionCue(node,nObj.cue,renderer,videoMetrics,true);
                    });
                    container.style.visibility = "visible";
                    this.timeHash = timeHash;
                }
            }
        };

        CaptionRenderer.prototype.refreshLayout = function() {
            var renderer = this,
                container = this.container,
                currentTime = this.currentTime,
                hashCue = renderer.hashCue,
                videoMetrics = getDisplayMetrics(renderer);

            // Get the canvas ready
            container.style.visibility = "hidden";
            styleCueContainer(this,videoMetrics);

            // Define storage for the available cue area, diminished as further cues are added
            // Cues occupy the largest possible area they can, either by width or height
            // (depending on whether the 'direction' of the cue is vertical or horizontal)
            // Cues which have an explicit position set do not detract from this area.
            this.availableCueArea = {
                "top": 0, "left": 0,
                "bottom": videoMetrics.height,
                "right": videoMetrics.width,
                "height": videoMetrics.height,
                "width": videoMetrics.width
            };
            this.currentNodes.forEach(function(nObj) {
                var node = nObj.node;
                markTimes(node,currentTime);
                timeStyle(node);
                positionCue(node,nObj.cue,renderer,videoMetrics,false);
            });
            container.style.visibility = "visible";
            //refresh was probably called because cue contents changed, so we better update the hash
            this.hash = this.currentNodes.map(function(nObj){ return hashCue(nObj.cue,currentTime); }).join();
            this.timeHash = this.currentNodes.map(function(nObj){ return cueTime(nObj.cue,currentTime); }).join();
        };
    }());

    /* processVideoElement(videoElement <HTMLVideoElement>,
     [options - JS Object])
     */
    CaptionRenderer.prototype.processVideoElement = function(videoElement,options) {
        options = options instanceof Object? options : {};
        var renderer = this,
            trackList = this.tracks,
            language = navigator.language || navigator.userLanguage,
            defaultLanguage = options.language,
            globalLanguage = defaultLanguage || language.split("-")[0],
            elements = [].slice.call(videoElement.querySelectorAll("track"),0);

        if(elements.length === 0){ return; }

        elements.forEach(function(trackElement) {
            var trackEnabled = false,
                sources = trackElement.querySelectorAll("source"),
                trackObject = new TextTrack(
                    trackElement.getAttribute("kind"),
                    trackElement.getAttribute("label"),
                    trackElement.getAttribute("srclang").split("-")[0]);

            trackObject.loadTrack(sources.length > 0?sources:trackElement.getAttribute("src"));

            // Now determine whether the track is visible by default.
            // The comments in this section come straight from the spec...
            trackObject.internalDefault = trackElement.hasAttribute("default");
            switch(trackObject.kind){
                // If the text track kind is subtitles or captions and the user has indicated an interest in having a track
                // with this text track kind, text track language, and text track label enabled, and there is no other text track
                // in the media element's list of text tracks with a text track kind of either subtitles or captions whose text track mode is showing
                // ---> Let the text track mode be showing.
                case "subtitles":
                case "captions": if(options.enableCaptionsByDefault && defaultLanguage === trackObject.language) {
                    trackEnabled = !trackList.some(function(track) {
                        return	(track.kind === "captions" || track.kind === "subtitles") &&
                            defaultLanguage === trackObject.language &&
                            trackObject.mode === "showing";
                    });
                }break;
                // If the text track kind is chapters and the text track language is one that the user agent has reason to believe is
                // appropriate for the user, and there is no other text track in the media element's list of text tracks with a text track
                // kind of chapters whose text track mode is showing
                // ---> Let the text track mode be showing.
                case "chapters": if (defaultLanguage === trackObject.language) {
                    trackEnabled = !trackList.filter(function(track) {
                        return track.kind === "chapters" && track.mode === "showing";
                    });
                }break;
                // If the text track kind is descriptions and the user has indicated an interest in having text descriptions
                // with this text track language and text track label enabled, and there is no other text track in the media element's
                // list of text tracks with a text track kind of descriptions whose text track mode is showing
                // ---> Let the text track mode be showing.
                case "descriptions": if(options.enableDescriptionsByDefault && defaultLanguage === trackObject.language) {
                    trackEnabled = !trackList.filter(function(track) {
                        return track.kind === "descriptions" && track.mode === "showing";
                    });
                }
            }

            // If there is a text track in the media element's list of text tracks whose text track mode is showing by default,
            // the user agent must furthermore change that text track's text track mode to hidden.
            trackEnabled && trackList.forEach(function(track) {
                if(track.internalDefault && trackObject.mode === "showing") {
                    trackObject.mode = "hidden";
                }
            });

            // If the track element has a default attribute specified, and there is no other text track in the media element's
            // list of text tracks whose text track mode is showing or showing by default
            // Let the text track mode be showing by default.
            trackEnabled |= trackObject.internalDefault && !trackList.some(function(track) {
                return track.mode === "showing";
            });

            // Otherwise
            // Let the text track mode be disabled.
            trackObject.mode = trackEnabled?"showing":"disabled";
            trackObject.renderer = renderer;
            trackList.push(trackObject);
        });

        this.rebuildCaptions(false);
    };

    return CaptionRenderer;
})();