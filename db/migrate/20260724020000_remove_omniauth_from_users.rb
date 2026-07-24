class RemoveOmniauthFromUsers < ActiveRecord::Migration[7.0]
  def change
    remove_index :users, column: [:provider, :uid], if_exists: true
    remove_column :users, :provider, :string
    remove_column :users, :uid, :string
  end
end
