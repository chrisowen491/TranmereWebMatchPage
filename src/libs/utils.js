module.exports = function (path, fs, Mustache) {
    return {
         loadSharedPartials: function() {
           var partials = {};

           var files = fs.readdirSync('./templates/partials');
           for (var i = 0, l = files.length; i < l; i++) {
             var file = files[i];

             if (file.match(/\.partial\.mustache$/)) {
               var name = path.basename(file, '.partial.mustache');
               partials[name] = fs.readFileSync('./templates/partials/' + file, {
                 encoding: 'utf8'
               });
             }
           }
           return partials;
         },
         buildPage: function (view, pageTpl) {
            var pageHTML = Mustache.render(fs.readFileSync(pageTpl).toString(), view, this.loadSharedPartials());
            return pageHTML;
         }
    };
};