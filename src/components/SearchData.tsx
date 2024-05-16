import { Box, Button, Input } from "@mantine/core"
import { useState } from "react"
import { Link, redirect } from "react-router-dom";

const SearchInput =()=>{
    const [query, setQuery] = useState('');
    const handleSubmit = (e: any) => {
      e.preventDefault()
      redirect(`/search/${query}`)
    };
    return(
      <form onSubmit={handleSubmit} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Input
        mr={5}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Phim cần tìm"
      />
      <Link to={`/search/${query}`} style={{color:'white'}}>
      <Button onClick={()=>setQuery('')} type="submit" >
        Tìm kiếm
      </Button>
      </Link>
      </form>
    )
}

export default SearchInput;