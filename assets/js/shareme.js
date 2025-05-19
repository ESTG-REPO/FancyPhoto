 $('#shareme').sharrre({
    share: {
      facebook: true,
      twitter: true,
      linkedin: true,
      pinterest: true
    },
    buttons: {
      facebook: { layout: 'button', text: 'Share' },
      twitter: { via: 'yourTwitterHandle', text: 'Tweet' },
      linkedin: { text: 'Share' },
      pinterest: { text: 'Pin it' }
    },
    enableHover: true,
    enableTracking: true,
    url: window.location.href,
    render: function(api, options){
      $(this).html(api.getButtons());
      $(this).find('.buttons a').click(function(){
        api.openPopup($(this).data('type'));
      });
    }
  });