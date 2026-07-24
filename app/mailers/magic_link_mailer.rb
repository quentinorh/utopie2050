class MagicLinkMailer < ApplicationMailer
  default from: "contact@sp2050.org"

  def login_link
    @user = params[:user]
    @token = params[:token]
    @magic_link_url = user_magic_link_url(token: @token)

    mail(
      to: @user.email,
      subject: "Ton lien de connexion SP2050"
    )
  end
end
