/* 
  Alpine Dev Tools: https://github.com/Te7a-Houdini/alpinejs-devtools
*/
function terminalData() {
  return {
    readers: [],
    readerScreen: "idle",
    isMounted: false,
    reload() {
      sessionStorage.removeItem("readers");
      this.readers = [];
      this.init();
    },
    init() {
      // get gists and parse the description field
      fetch("/list-readers")
        .then((response) => response.json())
        .then((response) => {
          console.log("fetched", response);
          // I could use collect.js to manipulate the response further.
          let readers = response.readers;
          this.readers = readers;
          console.log(this, readers);
        });
      setTimeout(() => (this.isMounted = true), 1000);
    },
  };
}
