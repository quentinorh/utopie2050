class RemoveTermsAcceptedFromUsers < ActiveRecord::Migration[7.0]
  def change
    remove_column :users, :terms_accepted, :boolean
  end
end
