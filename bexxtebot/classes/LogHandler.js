// class Timestamp {
//   constructor(year, month, day, hour, minute, second) {

//   }
// }

// class LogEntry {
//   constructor(year, month, day, hour, minute, second, data) {
//     this.year = year;
//     this.month = month;
//     this.day = day;
//     this.hour = hour;
//     this.minute = minute;
//     this.second = second;
//     this.data = data;
//   }
// }

export default class LogHandler {
  constructor() {
    this.rootDirectory = './logs'
  }


  attachDatabase(db) {
    this.db = db;
  }


  log(type, logContext, messageObject) {

    const eventData = {
      offense: logContext.offense,
      command: logContext.command,
      stack: logContext.stack,
      codeRef: logContext.codeRef,
      username: messageObject?.tags?.username,
      messageContent: messageObject?.content,
      action: logContext.action
    }

    this.db.log(type, eventData);
  }

}