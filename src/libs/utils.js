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
         buildImagePath: function (image, width, height) {
            var body = {
             "bucket": "trfc-programmes",
             "key": image,
               "edits": {
                 "resize": {
                   "width": width,
                   "height": height,
                   "fit": "fill",
                 }
               }
             };
            return "https://images.tranmere-web.com/" + Buffer.from(JSON.stringify(body)).toString('base64');
         },
         buildPage: function (view, pageTpl) {
            var pageHTML = Mustache.render(fs.readFileSync(pageTpl).toString(), view, this.loadSharedPartials());
            return pageHTML;
         },
         renderFragment : function(view, templateKey) {
            if(view.chart) {
                view.chart = JSON.stringify(view.chart);
            }
            var tpl = `./templates/partials/${templateKey}.partial.mustache`;
            return Mustache.render(fs.readFileSync(tpl).toString(), view, this.loadSharedPartials());
         },
    };
};