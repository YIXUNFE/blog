App = Ember.Application.create();

App.ApplicationAdapter = DS.LSAdapter.extend({
    namespace: 'bookmarks'
});

App.Bookmark = DS.Model.extend({
    title: DS.attr('string'),
    excerpt: DS.attr('string'),
    url: DS.attr('string'),
    tags: DS.attr('string'),
    fullname: DS.attr('string'),
    submittedOn: DS.attr('date'),

    tagnames: function () {
        var tags = this.get('tags').split(',');
        var tagArray = new Array();
        for (var i = 0; i < tags.length; i++) {
            tagArray.push(tags[i].trim())
        }
        return tagArray;
    }.property('tags')
});

App.Router.map(function () {
    this.resource('index', {path: '/'}, function () {
        this.resource('bookmark', { path: '/bookmarks/:bookmark_id' });
    });
    this.resource('newbookmark', {path: 'bookmark/new'});
});

App.NewbookmarkController = Ember.ObjectController.extend({
    actions: {
        save: function () {
            var url = $('#url').val();
            var tags = $('#tags').val();
            var fullname = $('#fullname').val();
            var title = $('#title').val();
            var excerpt = $('#excerpt').val();
            var submittedOn = new Date();
            var store = this.get('store');
            var bookmark = store.createRecord('bookmark', {
                url: url,
                tags: tags,
                fullname: fullname,
                title: title,
                excerpt: excerpt,
                submittedOn: submittedOn
            });
            bookmark.save();
            this.transitionToRoute('index');
        }
    }
});

//倒序排列
App.IndexController = Ember.ArrayController.extend({
    sortProperties: ['submittedOn'],
    sortAscending: false,
    itemController:'BookmarkDel'
});
App.BookmarkDelController = Ember.ObjectController.extend({
    actions: {
        del: function (record) {
            this.store.deleteRecord(record);
            record.save();
        }
    }
});
App.BookmarkController = Ember.ObjectController.extend({
    actions: {
        edit: function () {
            this.set('isediting', true);
        },
       update: function () {
            var content = this.get('content');
            this.set('submittedOn',new Date());
            content.save();
            this.set('isediting', false);
        }
    }
});
App.IndexRoute = Ember.Route.extend({
    model: function () {
        var bookmarks = this.get('store').findAll('bookmark');
        return bookmarks;
    }
});
App.BookmarkRoute = Ember.Route.extend({
    model: function (params) {
        var store = this.get('store');
        return store.find('bookmark', params.bookmark_id);
    }
});

Ember.Handlebars.helper('format-date', function (date) {
    return moment(date).fromNow();
});