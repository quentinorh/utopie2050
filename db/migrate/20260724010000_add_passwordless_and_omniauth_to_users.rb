class AddPasswordlessAndOmniauthToUsers < ActiveRecord::Migration[7.0]
  def change
    change_column_null :users, :encrypted_password, true

    add_column :users, :provider, :string
    add_column :users, :uid, :string
    add_column :users, :magic_link_token, :string
    add_column :users, :magic_link_sent_at, :datetime

    add_index :users, [:provider, :uid], unique: true
    add_index :users, :magic_link_token, unique: true
  end
end
