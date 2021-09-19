'use strict';

// system
import { cpus } from 'os';

// load env file
import dotenv from 'dotenv'
dotenv.config();

// cluster
import cluster from 'cluster';
const nbr_cpu_cores = cpus().length;

// web server libs
import express from 'express';


if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // go through cores
    for (let i = 1; i < nbr_cpu_cores; i++) {
        cluster.fork();
    }

    // if a worker dies
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);

        // restart the worker
        cluster.fork();
    });
}else{

    // grab instance of express
    const app = express();

    // enable parse body
    app.use(express.json());
    app.use(express.urlencoded({extended: true}));

    // enable serving static files through client folder
    app.use(express.static('public', ));

    // start server
    app.listen(+process.env.APP_PORT, () => {
        console.log(`${process.env.APP_NAME} - ${process.pid}, running on port ${+process.env.APP_PORT}`);
    });
}