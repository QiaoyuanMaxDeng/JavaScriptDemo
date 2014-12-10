define(['jquery', 'underscore', 'Backbone', 'text!views/home/HomeViewListItemView.tpl'],
    function ($, _, Backbone, HomeViewListItemViewTamplate) {

        var HomeViewListItemView = Backbone.View.extend({
			initialize: function() {
				this.el =  $('#homeview-list');
				this.template = _.template(HomeViewListItemViewTamplate)
			},

			render: function(eventName) {
				$(this.el).append(this.template(this.model));
				var baseURL = 'img/';
				this.el.find('img').last().attr('src', baseURL+this.model.icon);
				return this;
			}
		});
		return HomeViewListItemView;
    });

