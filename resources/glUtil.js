function setupTask(canvasId, taskFunction) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.log("Could not find canvas with id", canvasId);
        return;
    }
    
    try {
        var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    } catch (e) {}
    if (!gl) {
        console.log("Could not initialise WebGL");
        return;
    }
    
    var renderWidth, renderHeight;
    function computeCanvasSize() {
        renderWidth = Math.min(canvas.parentNode.clientWidth - 20, 820);
        renderHeight = Math.floor(renderWidth*9.0/16.0);
        canvas.width = renderWidth - 100;
        canvas.height = renderHeight;
        gl.viewport(0, 0, renderWidth, renderHeight);
    }
    
    window.addEventListener('resize', computeCanvasSize);
    computeCanvasSize();
    
    var task = new taskFunction(gl);
    
    var mouseDown = false;
    var lastMouseX, lastMouseY;
    var mouseMoveListener = function(event) {
        task.dragCamera(event.screenX - lastMouseX, event.screenY - lastMouseY);
        lastMouseX = event.screenX;
        lastMouseY = event.screenY;
    };
    canvas.addEventListener('mousedown', function(event) {
        if (!mouseDown && event.button == 0) {
            mouseDown = true;
            lastMouseX = event.screenX;
            lastMouseY = event.screenY;
            document.addEventListener('mousemove', mouseMoveListener);
        }
        event.preventDefault();
    });
    document.addEventListener('mouseup', function(event) {
        if (mouseDown && event.button == 0) {
            mouseDown = false;
            document.removeEventListener('mousemove', mouseMoveListener);
        }
    });

    var uiContainer = div();
    var weightSelector = ["Save"];
    var sliderTarget = div();
    var jointName = "a";
    var jointId = 1;

    uiContainer.appendChild(div('slider-container', sliderTarget));

    var x_nodes = new Array();
    var x_tangents = new Array();

    var y_nodes = new Array();
    var y_tangents = new Array();
    
    var z_nodes = new Array();
    var z_tangents = new Array();

    document.getElementById("axis_x").addEventListener('click', function(event) {
        saveCurves(task5Curve, axis);
        if (axis != 1) {
            axis = 1;
            task5Curve.nodes = x_nodes;
            task5Curve.tangents = x_tangents;
        }
        console.log(axis);
    });

    document.getElementById("axis_y").addEventListener('click', function(event) {
        saveCurves(task5Curve, axis);
        if (axis != 2) {
            axis = 2;
            task5Curve.nodes = y_nodes;
            task5Curve.tangents = y_tangents;
        }
        console.log(axis);
    });

    document.getElementById("axis_z").addEventListener('click', function(event) {
        saveCurves(task5Curve, axis);
        if (axis != 3) {
            axis = 3;
            task5Curve.nodes = z_nodes;
            task5Curve.tangents = z_tangents;
        }
        console.log(axis);
    });



    var saveCurves = function(curve, axis) {
        if (axis == 1) {
            x_nodes = curve.nodes;
            x_tangents = curve.tangents;
        }
        if (axis == 2) {
            y_nodes = curve.nodes;
            y_tangents = curve.tangents;
        }
        if (axis == 3) {
            z_nodes = curve.nodes;
            z_tangents = curve.tangents;
        }
    }


    timer = new Slider(sliderTarget, 0, 720, play_time, true, function(jointId, jointName, time) {
        play_time = time;
        value = 0
        if (task5Curve) {
            task5Curve.drawTask5(time)
            value = 153 - task5Curve.getValue(time);
        }
        this.setLabel(jointName + ': ' + time + ' frame');
        task.setJointAngle(jointId, value);
    }, [jointId, jointName]);


    document.getElementById("play").addEventListener('click', function(event) {
        animation_play = !animation_play;

    if (animation_play) {
        i = play_time;
        interval = setInterval(function(){
            value = 0
            timer.setTimer(play_time);
            timer.setLabel(jointName + ': ' + i + ' frame');
            i = (i + 1) % 720;
            play_time = i;
        }, 1);
    }

    else {
        clearInterval(interval);
    }

    });


    document.getElementById("set").addEventListener('click', function(event) {

        if (task5Curve) {
                var v = 153 - parseInt(document.getElementById("value").value);
               // task5Curve.drawTask5(1);
               if (v) {
                    task5Curve.addNode(play_time, v);
               }
            }

    });

    canvas.parentNode.appendChild(uiContainer);
    this.angle = 1;
    var flag = true;//increase
    var renderLoop = function() {
        task.render(gl, renderWidth, renderHeight);
        window.requestAnimationFrame(renderLoop);
    }
    window.requestAnimationFrame(renderLoop);

    return task;
}



var VertexSource = `
    uniform mat4 ModelViewProjection;
    
    attribute vec3 Position;
    
    void main() {
        gl_Position = ModelViewProjection*vec4(Position, 1.0);
    }
`;
var FragmentSource = `
    precision highp float;
    
    uniform vec4 Color;

    void main() {
        gl_FragColor = Color;
    }
`;


var TriangleMesh2 = function(gl, vertexPositions, indices, edgeIndices) {
    this.indexCount = indices.length;
    this.edgeIndexCount = edgeIndices.length;
    this.positionVbo = createVertexBuffer(gl, vertexPositions);
    this.indexIbo = createIndexBuffer(gl, indices);
    this.edgeIndexIbo = createIndexBuffer(gl, edgeIndices);
    this.shaderProgram = createShaderProgram(gl, VertexSource, FragmentSource);
}

TriangleMesh2.prototype.render = function(gl, model, view, projection, drawFaces, drawWireframe, wireColor) {
    drawFaces = defaultArg(drawFaces, true);
    drawWireframe = defaultArg(drawWireframe, true);
    wireColor = defaultArg(wireColor, new Vector(0, 0, 0));

    var modelViewProjection = projection.multiply(view).multiply(model);
    
    gl.useProgram(this.shaderProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionVbo);
    var positionAttrib = gl.getAttribLocation(this.shaderProgram, "Position");
    gl.enableVertexAttribArray(positionAttrib);
    gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 0);
    
    if (drawFaces) {
        gl.uniformMatrix4fv(gl.getUniformLocation(this.shaderProgram, "ModelViewProjection"), false, modelViewProjection.transpose().m); 
        gl.uniform4f(gl.getUniformLocation(this.shaderProgram, "Color"), 0.95, 0.95, 0.95, 1); 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexIbo);
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    }
    
    if (drawWireframe) {
        gl.lineWidth(2.0);
        
        modelViewProjection = Matrix.translate(0, 0, -1e-4).multiply(modelViewProjection);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.shaderProgram, "ModelViewProjection"), false, modelViewProjection.transpose().m); 
        
        gl.uniform4f(gl.getUniformLocation(this.shaderProgram, "Color"), wireColor.x, wireColor.y, wireColor.z, 1); 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexIbo);
        gl.drawElements(gl.LINES, this.edgeIndexCount, gl.UNSIGNED_SHORT, 0);
    }
}


