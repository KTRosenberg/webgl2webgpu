import glslangInit from "https://unpkg.com/@webgpu/glslang@0.0.9/dist/web-devel/glslang.js";
import * as wkcmd from "./worker_command.js";

let glslCompiler = null;

/*
    Testing how I would do compilation on a worker, 
    TODO: actually compile here instead of on the main thread
    Look into documentation for the OffscreenCanvas and the ThreeJS Fundamentals tutorial for that
*/
function compile(compiler, msg) {
    let b_vert;
    let b_frag;
    try {
        b_vert = compiler.compileGLSL( msg.vertex, "vertex" );
        b_frag = compiler.compileGLSL( msg.fragment, "fragment");

        console.log("in worker: vert bytes", b_vert);
        console.log("in worker: frag bytes", b_frag);

        // the items in the seconds argument are the data
        // that will be "transferred" with no copying --
        // must be part of the first argument as well (almost seems like syntax magic)
        // Note that apparently the data can only be accessed by 
        // the thread that has ownership, so transferring here will make the data
        // unavailable to the worker. This can go back-and-forth I think

        // sending the raw bytes back to the main thread 
        // (though maybe rendering could be done on this thread, 
        // and yet another worker spawned from this worker could handle the compilation)
        // user input could be handled in the main thread since only the main thread can
        // interact with the DOM -- input updates can be transferred via byte buffer,
        // and maybe do a buffer swap "thing" on the main thread
        postMessage(
            {
                "type" : "compileResult",

                vdata : b_vert, fdata : b_frag
            }, 
            [b_vert.buffer, b_frag.buffer]
        );

    } catch (err) {
        console.error(err);
        return;
    }
}

self.onmessage = (e) => {
    //console.group("XR support:");
    //console.log(navigator.xr);
    //console.groupEnd();
    // This actually works, but am not sure if this can be shared between
    // threads -- probably not, but you can transfer ownership of GPUBuffers and other
    // objects
    // navigator.gpu.requestAdapter().then((adapter) => {
    //     console.log(adapter);
    // });

    //console.log(e);
    const msg = e.data;
    //console.log("from main:", msg);

    switch (msg.type) {
    // TODO: would probably have an "init command"
    case wkcmd.COMPILE: {
        if (!glslCompiler) {
            glslangInit().then((val) => {
                console.log("COMPILER:", val);

                glslCompiler = val;

                compile(glslCompiler, msg);
            }).catch((err) => { console.error(err);});
        } else {
            compile(glslCompiler, msg);
        }

        break;
    }
    case wkcmd.TERMINATE: {
        close();
    }
    default: {

    }
    }

    // Just testing communication
    const reply = setTimeout(() => {
        postMessage({"type" : msg, msg : "Polo!"});
    }, 3000);
}