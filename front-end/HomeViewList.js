define(['jquery', 'underscore', 'Backbone', 'jqmNavigator', 'ViewStack', 'views/home/HomeViewListItemView', 'views/iframes/IFrameView'],
    function ($, _, Backbone, jqmNavigator, ViewStack, HomeViewListItemView, IFrameView) {
        var HomeViewList = Backbone.View.extend({
            events:{
                'click #stats': 'goToStats',
				......
            },  

            goToStats : function(e){
                var StatsTypeView = require('views/stats/StatsTypeView');
                ViewStack.push(new StatsTypeView());
            },
            ......

            render: function(eventName){
				$(this.el).empty();

				_.each(this.collection, function(item) {
					$(this.el).append(new HomeViewListItemView({model: item}).render().el);
				}, this);
				return this;
            }
       });
    return HomeViewList;
});
