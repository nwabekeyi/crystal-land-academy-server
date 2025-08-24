const updateCurrentTerm = require('./updateCurrentTerm');
const dueAnnouncements =  require('./dueAnnouncements');
const healthCheck = require('./healthCheck');

const cronJobs = async () =>{
    //list cronjobs
    try {
        updateCurrentTerm();
        dueAnnouncements();
        healthCheck();
        console.log('cron job started')
    } catch (error) {
        console.error('a cron jon failed to run:' + error);
  ;  }
};

module.exports = cronJobs;